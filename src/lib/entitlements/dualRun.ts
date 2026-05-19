/**
 * Shadow Entitlement Layer — Phase 3 dual-run wrapper.
 *
 * Phase 4 update: now delegates to the single `resolveEntitlement` gate so
 * every legacy decision flows through one chokepoint with invariant checks,
 * drift detection, and self-healing recommendation built in. Behavior is
 * unchanged in the default "dual" mode — legacy is returned.
 */
import { getSubscriptionTier } from "./TierService";
import { recordComparison } from "./metrics";
import { resolveEntitlement } from "./resolveEntitlement";

export type WrapContext = {
  userId: string | null | undefined;
  module: string;
};

/** Wrap a legacy boolean VIP decision. Returns the gate-resolved value. */
export function wrapVipCheck(legacy: boolean, ctx: WrapContext): boolean {
  try {
    return resolveEntitlement({
      userId: ctx.userId,
      module: ctx.module,
      legacy,
    }).value;
  } catch {
    return legacy;
  }
}

/** Wrap a legacy tier-slug decision. Returns the legacy slug unchanged. */
export function wrapTierCheck(legacy: string, ctx: WrapContext): string {
  try {
    if (ctx.userId) {
      void getSubscriptionTier(ctx.userId)
        .then((ssot) => {
          recordComparison({
            module: ctx.module,
            userId: ctx.userId ?? null,
            legacy,
            ssot,
            mismatch: (legacy ?? "").toLowerCase() !== (ssot ?? "").toLowerCase(),
          });
        })
        .catch(() => { /* swallow */ });
    }
  } catch {
    /* swallow */
  }
  return legacy;
