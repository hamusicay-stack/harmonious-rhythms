/**
 * Shadow Entitlement Layer — Phase 5 Authority Stabilization.
 *
 * Mode is now controlled by the server-side control plane
 * (`entitlement_control_plane`). The browser only READS the mode via
 * `controlPlane.ts` — it can no longer flip authority via localStorage.
 *
 * The gate continues to:
 *  - never throw into callers
 *  - always return a usable boolean
 *  - record comparisons for the metrics collector
 *  - emit drift snapshots for subscribers
 *
 * Confidence weighting replaces hard auto-rollback:
 *  - drift > rollback threshold → recommendation = "rollback-to-legacy"
 *    BUT we DO NOT auto-flip mode. The admin dashboard surfaces it.
 *  - drift between warning and rollback → "investigate"
 *  - SSoT confidence below threshold → keep dual evaluation
 *
 * The only path that ever auto-falls-back to legacy at runtime is when the
 * control plane has explicitly set `allow_auto_rollback = true`.
 */
import { isVip as ssotIsVipFn } from "./TierService";
import { recordComparison, getEntitlementMismatchReport } from "./metrics";
import {
  getCachedControlPlane,
  getEntitlementControlPlane,
  logRollbackRecommendation,
  type EntitlementMode,
} from "./controlPlane";
import { allowUserResolve } from "./rateLimit";
import { recordDriftSample, evaluateAnomalies, isSafetyMode } from "./anomalyDetector";
import "./health";

export type { EntitlementMode } from "./controlPlane";

export type Recommendation =
  | "stay-the-course"
  | "investigate"
  | "rollback-suggested";

export type DriftSnapshot = {
  mode: EntitlementMode;
  total: number;
  mismatches: number;
  rate: number;
  confidence: number; // 0-1
  recommendation: Recommendation;
  topHotspot: string | null;
  at: number;
};

const MIN_SAMPLES_FOR_ACTION = 25;

type Listener = (snap: DriftSnapshot) => void;
const listeners = new Set<Listener>();
let lastRecommendation: Recommendation = "stay-the-course";

/** Current mode from server control plane (cached). */
export function getEntitlementMode(): EntitlementMode {
  return getCachedControlPlane().mode;
}

/**
 * DEPRECATED — kept as a no-op for source compatibility. Mode is now
 * controlled exclusively by the server control plane + admin UI.
 */
export function setEntitlementMode(_mode: EntitlementMode): void {
  // eslint-disable-next-line no-console
  console.warn(
    "[entitlements] setEntitlementMode is disabled — mode is server-controlled. Use the admin Entitlements Control panel.",
  );
}

function computeConfidence(): { confidence: number; rate: number; total: number; top: string | null } {
  const r = getEntitlementMismatchReport();
  const rate = r.total > 0 ? r.mismatches / r.total : 0;
  // base correctness 0..1
  const base = 1 - rate;
  // sample size weighting (asymptotic toward 1 around 200 samples)
  const sampleFactor = Math.min(1, r.total / 200);
  const confidence = Math.max(0, Math.min(1, base * (0.5 + 0.5 * sampleFactor)));
  return { confidence, rate, total: r.total, top: r.hotspots[0]?.module ?? null };
}

function computeRecommendation(): { rec: Recommendation; rate: number; total: number; top: string | null; confidence: number } {
  const cp = getCachedControlPlane();
  const { confidence, rate, total, top } = computeConfidence();
  let rec: Recommendation = "stay-the-course";
  if (total >= MIN_SAMPLES_FOR_ACTION) {
    if (rate >= cp.drift_threshold_rollback) rec = "rollback-suggested";
    else if (rate >= cp.drift_threshold_warning) rec = "investigate";
  }
  return { rec, rate, total, top, confidence };
}

function emit(snap: DriftSnapshot) {
  for (const l of listeners) {
    try { l(snap); } catch { /* swallow */ }
  }
}

export function onEntitlementDrift(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getDriftSnapshot(): DriftSnapshot {
  const cp = getCachedControlPlane();
  const { rec, rate, total, top, confidence } = computeRecommendation();
  const r = getEntitlementMismatchReport();
  return {
    mode: cp.mode,
    total,
    mismatches: r.mismatches,
    rate,
    confidence,
    recommendation: rec,
    topHotspot: top,
    at: Date.now(),
  };
}

export type ResolveArgs = {
  userId: string | null | undefined;
  module: string;
  legacy: boolean;
  ssot?: boolean;
};

export type ResolveResult = {
  value: boolean;
  mode: EntitlementMode;
  source: "legacy" | "ssot";
  mismatch: boolean | null;
  recommendation: Recommendation;
};

// Simple stable hash → [0,100) bucket for rollout %.
function bucketForUser(userId: string | null | undefined): number {
  if (!userId) return 100; // unknown user → never in rollout slice
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 100;
}

export function resolveEntitlement(args: ResolveArgs): ResolveResult {
  const cp = getCachedControlPlane();
  // Per-user rate limit. Exceeded → return legacy immediately (continuity).
  if (!allowUserResolve(args.userId)) {
    return {
      value: args.legacy,
      mode: cp.mode,
      source: "legacy",
      mismatch: null,
      recommendation: lastRecommendation,
    };
  }
  const mode = cp.mode;
  let value = args.legacy;
  let source: "legacy" | "ssot" = "legacy";
  let mismatch: boolean | null = null;

  // Resolve "effective mode" with rollout %. Safety_mode forces dual.
  const inRollout = bucketForUser(args.userId) < cp.rollout_percentage;
  const baseEffective: EntitlementMode =
    mode === "ssot" ? "ssot" : mode === "legacy" ? "legacy" : inRollout ? "ssot" : "dual";
  const effectiveMode: EntitlementMode = isSafetyMode() ? "dual" : baseEffective;

  try {
    if (typeof args.ssot === "boolean") {
      mismatch = args.legacy !== args.ssot;
      try {
        recordComparison({
          module: args.module,
          userId: args.userId ?? null,
          legacy: args.legacy,
          ssot: args.ssot,
          mismatch,
        });
      } catch { /* swallow */ }

      if (mismatch) {
        // eslint-disable-next-line no-console
        console.error("[entitlements:invariant] legacy !== ssot", {
          module: args.module,
          userId: args.userId ?? null,
          legacy: args.legacy,
          ssot: args.ssot,
        });
      }

      if (effectiveMode === "ssot") {
        // Confidence-weighted selection — keep dual behavior when confidence low.
        const { confidence, rec } = computeRecommendation();
        const lowConfidence = confidence < cp.confidence_threshold_ssot;
        const shouldAutoRollback = cp.allow_auto_rollback && rec === "rollback-suggested";
        if (lowConfidence || shouldAutoRollback) {
          value = args.legacy;
          source = "legacy";
        } else {
          value = args.ssot;
          source = "ssot";
        }
      } else {
        value = args.legacy;
        source = "legacy";
      }
    } else if (args.userId) {
      // Async path — fire-and-forget; sync return stays legacy.
      void ssotIsVipFn(args.userId)
        .then((ssot) => {
          const mm = args.legacy !== ssot;
          try {
            recordComparison({
              module: args.module,
              userId: args.userId ?? null,
              legacy: args.legacy,
              ssot,
              mismatch: mm,
            });
          } catch { /* swallow */ }
          if (mm) {
            // eslint-disable-next-line no-console
            console.error("[entitlements:invariant] legacy !== ssot", {
              module: args.module,
              userId: args.userId ?? null,
              legacy: args.legacy,
              ssot,
            });
          }
          afterSample();
        })
        .catch(() => { /* swallow */ });
    }
  } catch {
    /* never throw out of the gate */
  }

  const { rec } = computeRecommendation();
  if (rec !== lastRecommendation) {
    lastRecommendation = rec;
    // eslint-disable-next-line no-console
    console.warn("[entitlements:recommendation]", rec);
    if (rec === "rollback-suggested") {
      void logRollbackRecommendation({
        mode,
        snapshot: getDriftSnapshot(),
      }).catch(() => { /* swallow */ });
    }
  }

  try { emit(getDriftSnapshot()); } catch { /* swallow */ }

  return { value, mode, source, mismatch, recommendation: rec };
}

function afterSample() {
  try { emit(getDriftSnapshot()); } catch { /* swallow */ }
  const { rec } = computeRecommendation();
  if (rec !== lastRecommendation) {
    lastRecommendation = rec;
    // eslint-disable-next-line no-console
    console.warn("[entitlements:recommendation]", rec);
    if (rec === "rollback-suggested") {
      void logRollbackRecommendation({ snapshot: getDriftSnapshot() }).catch(() => { /* swallow */ });
    }
  }
}

// Refresh control plane periodically so the gate picks up admin changes
// even when realtime is not available.
if (typeof window !== "undefined") {
  void getEntitlementControlPlane().catch(() => { /* swallow */ });
  setInterval(() => {
    void getEntitlementControlPlane().catch(() => { /* swallow */ });
  }, 15_000);

  // Read-only debug inspectors only.
  const w = window as unknown as Record<string, unknown>;
  w.__entitlementsDrift = getDriftSnapshot;
  w.__entitlementsMode = getEntitlementMode;
  // Authority hooks are intentionally NOT exposed anymore:
  //   __entitlementsSetMode is removed.
}
