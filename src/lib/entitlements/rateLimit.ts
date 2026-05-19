/**
 * Phase 6 — Rate limiting for entitlement operations.
 *
 * Token-bucket-ish sliding window. Purely advisory:
 *  - If rate exceeded → DO NOT block the user.
 *  - Caller is expected to serve last-known-good value instead.
 *  - We just record a "rate_limit_hit" event for observability.
 *
 * Buckets:
 *  - per-user resolveEntitlement: 20 / sec
 *  - per-system control plane reads: 2000 / minute
 *  - per-admin mode-switch: 5 / minute
 */

type Window = { windowMs: number; max: number; events: number[] };

const buckets = new Map<string, Window>();
const hits = { user: 0, controlPlane: 0, adminMode: 0 };

function take(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.windowMs !== windowMs || b.max !== max) {
    b = { windowMs, max, events: [] };
    buckets.set(key, b);
  }
  // Drop events outside the window.
  const cutoff = now - windowMs;
  while (b.events.length > 0 && b.events[0] < cutoff) b.events.shift();
  if (b.events.length >= max) return false;
  b.events.push(now);
  return true;
}

export function allowUserResolve(userId: string | null | undefined): boolean {
  const k = `user:${userId ?? "anon"}`;
  const ok = take(k, 1_000, 20);
  if (!ok) hits.user += 1;
  return ok;
}

export function allowControlPlaneFetch(): boolean {
  const ok = take("cp:system", 60_000, 2000);
  if (!ok) hits.controlPlane += 1;
  return ok;
}

export function allowAdminModeSwitch(adminId: string | null | undefined): boolean {
  const k = `admin:${adminId ?? "anon"}`;
  const ok = take(k, 60_000, 5);
  if (!ok) hits.adminMode += 1;
  return ok;
}

export function getRateLimitMetrics() {
  return { ...hits };
}

export function resetRateLimitMetrics() {
  hits.user = 0; hits.controlPlane = 0; hits.adminMode = 0;
}
