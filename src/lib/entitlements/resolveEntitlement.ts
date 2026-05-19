/**
 * Shadow Entitlement Layer — Phase 4 hard guarantee safety layer.
 *
 * Single gate: every entitlement decision in the app SHOULD go through
 * `resolveEntitlement()`. The gate:
 *
 *   1. Honors a runtime mode flag — "legacy" | "ssot" | "dual" (default "dual").
 *      Mode is read from localStorage("entitlements:mode") so it can be flipped
 *      live without redeploy.
 *   2. ALWAYS returns a usable value, even if SSoT lookup throws. The active
 *      value tracks the mode; legacy is the ultimate safety net.
 *   3. Runs an invariant check (legacy === ssot when both known). On violation
 *      it logs a critical error and feeds the metrics collector but NEVER
 *      throws into the caller.
 *   4. Maintains a drift score + recommendation engine. When drift crosses
 *      a critical threshold, the recommendation flips to "rollback-to-legacy"
 *      and (if mode is "ssot") emits a one-shot alert with the recommendation.
 *   5. Exposes monitoring hooks for ad-hoc subscription + a snapshot getter.
 *
 * This file MUST NOT crash any caller. All paths are try/catch wrapped and
 * always return a defined boolean (or the legacy fallback).
 */
import { isVip as ssotIsVipFn } from "./TierService";
import { recordComparison, getEntitlementMismatchReport } from "./metrics";

export type EntitlementMode = "legacy" | "ssot" | "dual";

const MODE_KEY = "entitlements:mode";
const DEFAULT_MODE: EntitlementMode = "dual";

// Drift thresholds for the recommendation engine.
const WARNING_RATE = 0.05; // 5%
const CRITICAL_RATE = 0.15; // 15%
const MIN_SAMPLES_FOR_ACTION = 25;

export type Recommendation =
  | "stay-the-course"
  | "investigate"
  | "rollback-to-legacy";

export type DriftSnapshot = {
  mode: EntitlementMode;
  total: number;
  mismatches: number;
  rate: number;
  recommendation: Recommendation;
  topHotspot: string | null;
  at: number;
};

type Listener = (snap: DriftSnapshot) => void;
const listeners = new Set<Listener>();
let lastRecommendation: Recommendation = "stay-the-course";
let alertedCritical = false;

function readMode(): EntitlementMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.localStorage?.getItem?.(MODE_KEY);
    if (raw === "legacy" || raw === "ssot" || raw === "dual") return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

export function getEntitlementMode(): EntitlementMode {
  return readMode();
}

export function setEntitlementMode(mode: EntitlementMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem?.(MODE_KEY, mode);
    alertedCritical = false; // reset alert latch when operator changes mode
  } catch {
    /* ignore */
  }
}

function computeRecommendation(): { rec: Recommendation; rate: number; total: number; top: string | null } {
  const r = getEntitlementMismatchReport();
  const rate = r.total > 0 ? r.mismatches / r.total : 0;
  let rec: Recommendation = "stay-the-course";
  if (r.total >= MIN_SAMPLES_FOR_ACTION) {
    if (rate >= CRITICAL_RATE) rec = "rollback-to-legacy";
    else if (rate >= WARNING_RATE) rec = "investigate";
  }
  return { rec, rate, total: r.total, top: r.hotspots[0]?.module ?? null };
}

function emit(snap: DriftSnapshot) {
  for (const l of listeners) {
    try { l(snap); } catch { /* swallow */ }
  }
}

/** Subscribe to drift snapshots (fires after each resolveEntitlement call). */
export function onEntitlementDrift(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** One-shot snapshot of current drift state + recommendation. */
export function getDriftSnapshot(): DriftSnapshot {
  const { rec, rate, total, top } = computeRecommendation();
  const r = getEntitlementMismatchReport();
  return {
    mode: readMode(),
    total,
    mismatches: r.mismatches,
    rate,
    recommendation: rec,
    topHotspot: top,
    at: Date.now(),
  };
}

export type ResolveArgs = {
  userId: string | null | undefined;
  module: string;
  /** Pre-computed legacy value (synchronous). Always required as the safety net. */
  legacy: boolean;
  /** Optional pre-computed SSoT value. When omitted, gate fetches asynchronously. */
  ssot?: boolean;
};

export type ResolveResult = {
  value: boolean;
  mode: EntitlementMode;
  source: "legacy" | "ssot";
  mismatch: boolean | null; // null if SSoT not yet known
  recommendation: Recommendation;
};

/**
 * Single gate for entitlement decisions.
 *
 * Synchronous: returns immediately with `value` chosen per current mode.
 * When SSoT must be resolved asynchronously, the gate fires it in the
 * background, records the comparison, runs the invariant check, and emits
 * a drift snapshot to subscribers. The synchronously returned value
 * NEVER changes after the fact — callers always see a stable answer.
 */
export function resolveEntitlement(args: ResolveArgs): ResolveResult {
  const mode = readMode();
  let value = args.legacy;
  let source: "legacy" | "ssot" = "legacy";
  let mismatch: boolean | null = null;

  try {
    if (typeof args.ssot === "boolean") {
      mismatch = args.legacy !== args.ssot;
      // Invariant check (sync path).
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

      if (mode === "ssot") {
        // In SSoT mode we prefer SSoT — BUT if the recommendation has flipped
        // to rollback we fall back to legacy as a self-heal action.
        const { rec } = computeRecommendation();
        if (rec === "rollback-to-legacy") {
          value = args.legacy;
          source = "legacy";
        } else {
          value = args.ssot;
          source = "ssot";
        }
      } else if (mode === "legacy" || mode === "dual") {
        value = args.legacy;
        source = "legacy";
      }
    } else if (args.userId) {
      // Async path: fire-and-forget SSoT comparison; sync return is legacy.
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
        .catch(() => { /* swallow — system stays functional */ });
    }
  } catch {
    /* never throw out of the gate */
  }

  const { rec } = computeRecommendation();
  // Latch a one-shot critical alert when in ssot mode and drift goes critical.
  if (!alertedCritical && mode === "ssot" && rec === "rollback-to-legacy") {
    alertedCritical = true;
    // eslint-disable-next-line no-console
    console.error(
      "[entitlements:alert] CRITICAL drift detected — recommendation: rollback-to-legacy. " +
      "Call setEntitlementMode('legacy') or setEntitlementMode('dual') to self-heal.",
    );
  }
  if (rec !== lastRecommendation) {
    lastRecommendation = rec;
    // eslint-disable-next-line no-console
    console.warn("[entitlements:recommendation]", rec);
  }

  // Emit drift snapshot to subscribers (best-effort).
  try { emit(getDriftSnapshot()); } catch { /* swallow */ }

  return {
    value,
    mode,
    source,
    mismatch,
    recommendation: rec,
  };
}

function afterSample() {
  try { emit(getDriftSnapshot()); } catch { /* swallow */ }
  const { rec } = computeRecommendation();
  if (rec !== lastRecommendation) {
    lastRecommendation = rec;
    // eslint-disable-next-line no-console
    console.warn("[entitlements:recommendation]", rec);
  }
  const mode = readMode();
  if (!alertedCritical && mode === "ssot" && rec === "rollback-to-legacy") {
    alertedCritical = true;
    // eslint-disable-next-line no-console
    console.error(
      "[entitlements:alert] CRITICAL drift detected — recommendation: rollback-to-legacy. " +
      "Call setEntitlementMode('legacy') or setEntitlementMode('dual') to self-heal.",
    );
  }
}

// Expose monitoring hooks on window for ad-hoc inspection during validation.
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  w.__entitlementsGate = resolveEntitlement;
  w.__entitlementsDrift = getDriftSnapshot;
  w.__entitlementsMode = getEntitlementMode;
  w.__entitlementsSetMode = setEntitlementMode;
  w.__entitlementsOnDrift = onEntitlementDrift;
}
