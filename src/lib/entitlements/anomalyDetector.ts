/**
 * Anomaly detection — OBSERVATIONAL ONLY (Phase 7 consolidation).
 *
 * Watches drift snapshots + cache health + mode change history and emits
 * categorized alerts. The detector NEVER:
 *   - auto-rolls-back the mode
 *   - alters cache TTLs
 *   - influences resolveEntitlement's return value
 *
 * Anomalies are surfaced via getAnomalyMetrics() / onAnomaly() for admin
 * visibility only. `isSafetyMode()` reports whether instability has been
 * observed; consumers may use it for UX warnings, but the decision path
 * does not consult it.
 */
import { getEntitlementMismatchReport } from "./metrics";
import { getCacheMetrics } from "./cache";

export type AnomalyType =
  | "DRIFT_SPIKE"
  | "MODE_FLAPPING"
  | "CONFIDENCE_COLLAPSE"
  | "CONTROL_PLANE_INSTABILITY";

export type AnomalyEvent = {
  type: AnomalyType;
  at: number;
  detail: string;
  metrics: Record<string, number | string | null>;
};

type Listener = (e: AnomalyEvent) => void;
const listeners = new Set<Listener>();

const events: AnomalyEvent[] = [];
const EVENTS_MAX = 100;

// Rolling history of mismatch-rate samples.
type Sample = { ts: number; rate: number; confidence: number };
const samples: Sample[] = [];
const SAMPLE_MAX = 200;

// Mode change history for flapping detection.
const modeChanges: { ts: number; mode: string }[] = [];
const MODE_CHANGES_MAX = 50;

let safetyMode = false;
let safetyEnteredAt = 0;
const STABILITY_REQUIRED_MS = 5 * 60_000; // 5 minutes stable to exit

export function isSafetyMode() { return safetyMode; }

export function recordModeChange(mode: string) {
  modeChanges.push({ ts: Date.now(), mode });
  if (modeChanges.length > MODE_CHANGES_MAX) modeChanges.shift();
}

export function recordDriftSample(rate: number, confidence: number) {
  samples.push({ ts: Date.now(), rate, confidence });
  if (samples.length > SAMPLE_MAX) samples.shift();
}

export function onAnomaly(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function emit(e: AnomalyEvent) {
  events.push(e);
  if (events.length > EVENTS_MAX) events.shift();
  for (const l of listeners) {
    try { l(e); } catch { /* swallow */ }
  }
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[entitlement_anomaly_detected]", e.type, e.detail);
    try {
      window.dispatchEvent(new CustomEvent("entitlement_anomaly_detected", { detail: e }));
    } catch { /* swallow */ }
  }
}

function enterSafetyMode(reason: string) {
  if (safetyMode) return;
  safetyMode = true;
  safetyEnteredAt = Date.now();
  // Observational only — no cache TTL inflation, no decision-path effect.
  emit({
    type: "CONTROL_PLANE_INSTABILITY",
    at: Date.now(),
    detail: `safety_mode entered: ${reason}`,
    metrics: {},
  });
}

function maybeExitSafetyMode() {
  if (!safetyMode) return;
  // Need STABILITY_REQUIRED_MS without anomaly events.
  const lastEvt = events[events.length - 1];
  const stableFor = Date.now() - (lastEvt?.at ?? safetyEnteredAt);
  if (stableFor >= STABILITY_REQUIRED_MS) {
    safetyMode = false;
    // Observational only — nothing else to unwind.
    // eslint-disable-next-line no-console
    console.info("[entitlements:safety_mode] cleared after stability window");
  }
}

/** Runs the full anomaly sweep; call on every drift snapshot. */
export function evaluateAnomalies(): AnomalyEvent[] {
  const out: AnomalyEvent[] = [];
  const report = getEntitlementMismatchReport();
  const cache = getCacheMetrics();
  const now = Date.now();

  // 1. DRIFT_SPIKE — last 60s rate vs prior 60s rate.
  const recent = samples.filter((s) => now - s.ts < 60_000);
  const prior = samples.filter((s) => now - s.ts >= 60_000 && now - s.ts < 120_000);
  if (recent.length >= 10 && prior.length >= 10) {
    const r = avg(recent.map((s) => s.rate));
    const p = avg(prior.map((s) => s.rate));
    if (r - p > 0.20) {
      const evt: AnomalyEvent = {
        type: "DRIFT_SPIKE", at: now,
        detail: `mismatch rate jumped ${(p * 100).toFixed(1)}% → ${(r * 100).toFixed(1)}%`,
        metrics: { recent: r, prior: p },
      };
      out.push(evt); emit(evt);
      enterSafetyMode("drift spike");
    }
  }

  // 2. CONFIDENCE_COLLAPSE — confidence < 0.4 with >=50 samples.
  if (report.total >= 50 && report.confidence / 100 < 0.4) {
    const evt: AnomalyEvent = {
      type: "CONFIDENCE_COLLAPSE", at: now,
      detail: `confidence at ${report.confidence}%`,
      metrics: { total: report.total, confidence: report.confidence },
    };
    out.push(evt); emit(evt);
    enterSafetyMode("confidence collapse");
  }

  // 3. MODE_FLAPPING — ≥3 mode changes in last 5 min.
  const recentChanges = modeChanges.filter((m) => now - m.ts < 5 * 60_000);
  if (recentChanges.length >= 3) {
    const evt: AnomalyEvent = {
      type: "MODE_FLAPPING", at: now,
      detail: `${recentChanges.length} mode changes in 5min`,
      metrics: { count: recentChanges.length },
    };
    out.push(evt); emit(evt);
    enterSafetyMode("mode flapping");
  }

  // 4. CONTROL_PLANE_INSTABILITY — cache loader errors high, latency huge.
  const totalCacheOps = cache.hits + cache.misses;
  const errorRate = totalCacheOps > 0 ? cache.loaderErrors / totalCacheOps : 0;
  if ((cache.avgLatencyMs > 2_000 && cache.latencySamples >= 3) || errorRate > 0.2) {
    const evt: AnomalyEvent = {
      type: "CONTROL_PLANE_INSTABILITY", at: now,
      detail: `latency=${cache.avgLatencyMs.toFixed(0)}ms errorRate=${(errorRate * 100).toFixed(1)}%`,
      metrics: { latency: cache.avgLatencyMs, errorRate },
    };
    out.push(evt); emit(evt);
    enterSafetyMode("control plane instability");
  }

  maybeExitSafetyMode();
  return out;
}

export function getAnomalyMetrics() {
  return {
    safetyMode,
    anomalyCount: events.length,
    recent: events.slice(-20),
  };
}

function avg(xs: number[]) {
  if (xs.length === 0) return 0;
  let s = 0; for (const x of xs) s += x; return s / xs.length;
}
