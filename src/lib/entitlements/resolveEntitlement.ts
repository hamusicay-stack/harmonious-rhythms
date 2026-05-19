/**
 * Entitlements — CONSOLIDATION LAYER (Phase 7).
 *
 * Single decision entry point. Authority order:
 *   1. SSoT (primary truth)
 *   2. Legacy (deterministic fallback)
 *   3. Dual (safe mode — returns legacy and records comparison)
 *
 * Control plane is CONFIGURATION ONLY (mode + rollout). It does not
 * participate in decision logic. Drift, confidence, anomalies and
 * recommendations are OBSERVATIONAL and surfaced via EntitlementSignal —
 * they never alter the returned entitlement value.
 *
 * Deterministic failover:
 *   - mode "ssot" → use SSoT; if SSoT unavailable/threw → legacy
 *   - mode "legacy" → use legacy
 *   - mode "dual" → in-rollout users use SSoT (with legacy failover);
 *                   out-of-rollout users return legacy. Comparison is
 *                   always recorded when both values are known.
 */
import { isVip as ssotIsVipFn } from "./TierService";
import { recordComparison, getEntitlementMismatchReport } from "./metrics";
import {
  getCachedControlPlane,
  getEntitlementControlPlane,
  type EntitlementMode,
} from "./controlPlane";
import { recordDriftSample, evaluateAnomalies, getAnomalyMetrics, isSafetyMode } from "./anomalyDetector";
import "./health";

export type { EntitlementMode } from "./controlPlane";

export type Recommendation =
  | "stay-the-course"
  | "investigate"
  | "rollback-suggested";

export type StabilityLevel = "stable" | "degraded" | "unstable";

/**
 * Unified observational signal. Every observability subsystem feeds into
 * this single object. NOTHING in resolveEntitlement consults it for the
 * returned entitlement value.
 */
export type EntitlementSignal = {
  confidenceScore: number; // 0..1
  driftRate: number;       // 0..1
  anomalyState: {
    safetyMode: boolean;
    anomalyCount: number;
    lastType: string | null;
  };
  recommendation: Recommendation;
  stabilityLevel: StabilityLevel;
};

export type DriftSnapshot = {
  mode: EntitlementMode;
  total: number;
  mismatches: number;
  rate: number;
  confidence: number;
  recommendation: Recommendation;
  topHotspot: string | null;
  at: number;
  signal: EntitlementSignal;
};

const MIN_SAMPLES_FOR_RECOMMENDATION = 25;

type Listener = (snap: DriftSnapshot) => void;
const listeners = new Set<Listener>();
let lastRecommendation: Recommendation = "stay-the-course";

/** Current mode from server control plane (cached). */
export function getEntitlementMode(): EntitlementMode {
  return getCachedControlPlane().mode;
}

/** DEPRECATED — mode is server-controlled via admin Entitlements Control panel. */
export function setEntitlementMode(_mode: EntitlementMode): void {
  // eslint-disable-next-line no-console
  console.warn(
    "[entitlements] setEntitlementMode is disabled — mode is server-controlled.",
  );
}

function computeConfidence(): { confidence: number; rate: number; total: number; top: string | null } {
  const r = getEntitlementMismatchReport();
  const rate = r.total > 0 ? r.mismatches / r.total : 0;
  const base = 1 - rate;
  const sampleFactor = Math.min(1, r.total / 200);
  const confidence = Math.max(0, Math.min(1, base * (0.5 + 0.5 * sampleFactor)));
  return { confidence, rate, total: r.total, top: r.hotspots[0]?.module ?? null };
}

function computeRecommendation(): { rec: Recommendation; rate: number; total: number; top: string | null; confidence: number } {
  const cp = getCachedControlPlane();
  const { confidence, rate, total, top } = computeConfidence();
  let rec: Recommendation = "stay-the-course";
  if (total >= MIN_SAMPLES_FOR_RECOMMENDATION) {
    if (rate >= cp.drift_threshold_rollback) rec = "rollback-suggested";
    else if (rate >= cp.drift_threshold_warning) rec = "investigate";
  }
  return { rec, rate, total, top, confidence };
}

/** Build the unified observational signal. Read-only — never used for decisions. */
export function getEntitlementSignal(): EntitlementSignal {
  const { confidence, rate } = computeConfidence();
  const { rec } = computeRecommendation();
  const anom = getAnomalyMetrics();
  const lastEvt = anom.recent[anom.recent.length - 1] ?? null;
  let stability: StabilityLevel = "stable";
  if (isSafetyMode() || rec === "rollback-suggested") stability = "unstable";
  else if (rec === "investigate" || anom.anomalyCount > 0) stability = "degraded";
  return {
    confidenceScore: confidence,
    driftRate: rate,
    anomalyState: {
      safetyMode: isSafetyMode(),
      anomalyCount: anom.anomalyCount,
      lastType: lastEvt?.type ?? null,
    },
    recommendation: rec,
    stabilityLevel: stability,
  };
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
    signal: getEntitlementSignal(),
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
  source: "ssot" | "legacy";
  mismatch: boolean | null;
  recommendation: Recommendation;
  signal: EntitlementSignal;
};

// Stable hash → [0,100) bucket for rollout %.
function bucketForUser(userId: string | null | undefined): number {
  if (!userId) return 100;
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 100;
}

/**
 * Single decision entry point for every entitlement check.
 *
 * Deterministic — only mode + rollout decide which source to read.
 * Observability is recorded but never influences the returned value.
 */
export function resolveEntitlement(args: ResolveArgs): ResolveResult {
  const cp = getCachedControlPlane();
  const mode = cp.mode;

  // Effective mode is purely a function of (mode, rollout, userId).
  // No safety override. No confidence weighting. No rate-limit bypass.
  const inRollout = bucketForUser(args.userId) < cp.rollout_percentage;
  const effectiveMode: EntitlementMode =
    mode === "ssot" ? "ssot"
    : mode === "legacy" ? "legacy"
    : inRollout ? "ssot" : "dual";

  let value = args.legacy;
  let source: "ssot" | "legacy" = "legacy";
  let mismatch: boolean | null = null;

  try {
    // 1. Record comparison whenever both values are known (observation only).
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

      // 2. Deterministic selection by effective mode.
      if (effectiveMode === "ssot") {
        value = args.ssot;
        source = "ssot";
      } else {
        value = args.legacy;
        source = "legacy";
      }
    } else if (effectiveMode !== "legacy" && args.userId) {
      // Async path — sync return stays legacy; SSoT result feeds metrics only.
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
        .catch(() => { /* SSoT unavailable → legacy already returned */ });
    }
  } catch {
    // Final deterministic failover — legacy is the safety net.
    value = args.legacy;
    source = "legacy";
  }

  // 3. Recommendation transitions are logged for admins — never auto-acted upon.
  const { rec } = computeRecommendation();
  if (rec !== lastRecommendation) {
    lastRecommendation = rec;
    // eslint-disable-next-line no-console
    console.warn("[entitlements:recommendation]", rec);
  }

  // 4. Observation sampling.
  try {
    const snap = getDriftSnapshot();
    recordDriftSample(snap.rate, snap.confidence);
    evaluateAnomalies();
    emit(snap);
  } catch { /* swallow */ }

  return {
    value,
    mode,
    source,
    mismatch,
    recommendation: rec,
    signal: getEntitlementSignal(),
  };
}

function afterSample() {
  try {
    const snap = getDriftSnapshot();
    recordDriftSample(snap.rate, snap.confidence);
    evaluateAnomalies();
    emit(snap);
  } catch { /* swallow */ }
}

// Background refresh of the control-plane cache (no decision impact).
if (typeof window !== "undefined") {
  void getEntitlementControlPlane().catch(() => { /* swallow */ });
  setInterval(() => {
    void getEntitlementControlPlane().catch(() => { /* swallow */ });
  }, 15_000);

  const w = window as unknown as Record<string, unknown>;
  w.__entitlementsDrift = getDriftSnapshot;
  w.__entitlementsMode = getEntitlementMode;
  w.__entitlementsSignal = getEntitlementSignal;
}
