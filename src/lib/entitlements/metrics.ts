/**
 * Shadow Entitlement Layer — Phase 3 metrics collector.
 *
 * In-memory aggregate of dual-run comparison outcomes, with optional
 * localStorage persistence so reports survive reloads during validation.
 *
 * NEVER affects user-facing behavior:
 *  - All recording is synchronous, in-memory, and try/catch-wrapped.
 *  - Threshold breach (default 5%) logs a warning. It does NOT throw,
 *    block, or alter return values anywhere.
 */

const STORAGE_KEY = "entitlements:metrics:v1";
const THRESHOLD = 0.05; // 5% mismatch rate triggers a warning only.

export type MismatchRecord = {
  ts: number;
  day: string; // YYYY-MM-DD (UTC)
  module: string;
  userId: string | null;
  legacy: unknown;
  ssot: unknown;
};

type MetricsState = {
  total: number;
  mismatches: number;
  perModule: Record<string, { total: number; mismatches: number }>;
  perDay: Record<string, { total: number; mismatches: number }>;
  recent: MismatchRecord[]; // ring buffer (last 200)
  warned: boolean;
};

const RECENT_MAX = 200;

function emptyState(): MetricsState {
  return {
    total: 0,
    mismatches: 0,
    perModule: {},
    perDay: {},
    recent: [],
    warned: false,
  };
}

function load(): MetricsState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage?.getItem?.(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<MetricsState>;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function save(s: MetricsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / unavailable — ignore */
  }
}

let state: MetricsState = load();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function debug(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage?.getItem?.("entitlements:debug") === "1" ||
    (window as unknown as { __ENTITLEMENTS_DEBUG__?: boolean })
      .__ENTITLEMENTS_DEBUG__ === true
  );
}

export type RecordArgs = {
  module: string;
  userId: string | null;
  legacy: unknown;
  ssot: unknown;
  mismatch: boolean;
};

export function recordComparison(args: RecordArgs): void {
  try {
    const day = todayUTC();
    state.total += 1;
    const mod = (state.perModule[args.module] ||= { total: 0, mismatches: 0 });
    mod.total += 1;
    const d = (state.perDay[day] ||= { total: 0, mismatches: 0 });
    d.total += 1;

    if (args.mismatch) {
      state.mismatches += 1;
      mod.mismatches += 1;
      d.mismatches += 1;
      const rec: MismatchRecord = {
        ts: Date.now(),
        day,
        module: args.module,
        userId: args.userId,
        legacy: args.legacy,
        ssot: args.ssot,
      };
      state.recent.push(rec);
      if (state.recent.length > RECENT_MAX) {
        state.recent.splice(0, state.recent.length - RECENT_MAX);
      }
      if (debug()) {
        // eslint-disable-next-line no-console
        console.warn("[entitlements:mismatch]", rec);
      }
    }

    // Safety guard: warn once if mismatch rate exceeds threshold.
    const rate = state.total > 0 ? state.mismatches / state.total : 0;
    if (!state.warned && state.total >= 20 && rate > THRESHOLD) {
      state.warned = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[entitlements:guard] mismatch rate ${(rate * 100).toFixed(2)}% exceeds ${(THRESHOLD * 100).toFixed(0)}% — logging only, no system change.`,
      );
    }

    save(state);
  } catch {
    /* metrics must never break flow */
  }
}

export type EntitlementMismatchReport = {
  total: number;
  mismatches: number;
  consistencyPct: number; // 0–100
  confidence: number; // 0–100
  perDay: Record<string, { total: number; mismatches: number; rate: number }>;
  hotspots: Array<{ module: string; total: number; mismatches: number; rate: number }>;
  recent: MismatchRecord[];
};

export function getEntitlementMismatchReport(): EntitlementMismatchReport {
  const consistency = state.total === 0 ? 100 : ((state.total - state.mismatches) / state.total) * 100;
  // Confidence rises with sample size and consistency.
  const sampleFactor = Math.min(1, state.total / 200);
  const confidence = Math.round(consistency * (0.5 + 0.5 * sampleFactor));

  const hotspots = Object.entries(state.perModule)
    .map(([module, v]) => ({
      module,
      total: v.total,
      mismatches: v.mismatches,
      rate: v.total > 0 ? v.mismatches / v.total : 0,
    }))
    .sort((a, b) => b.mismatches - a.mismatches || b.rate - a.rate);

  const perDay = Object.fromEntries(
    Object.entries(state.perDay).map(([day, v]) => [
      day,
      { total: v.total, mismatches: v.mismatches, rate: v.total > 0 ? v.mismatches / v.total : 0 },
    ]),
  );

  return {
    total: state.total,
    mismatches: state.mismatches,
    consistencyPct: Number(consistency.toFixed(2)),
    confidence,
    perDay,
    hotspots,
    recent: [...state.recent],
  };
}

export function resetEntitlementMetrics(): void {
  state = emptyState();
  save(state);
}

// Expose on window for ad-hoc inspection during validation.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__entitlementsReport = getEntitlementMismatchReport;
  (window as unknown as Record<string, unknown>).__entitlementsReset = resetEntitlementMetrics;
}
