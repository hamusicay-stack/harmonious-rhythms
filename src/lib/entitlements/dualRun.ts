/**
 * Shadow Entitlement Layer — Phase 3 dual-run wrapper.
 *
 * Pattern:
 *   const isVip = wrapVipCheck(legacyIsVip, { userId, module: "pros.$proId" });
 *
 * The wrapper:
 *   1. Returns the LEGACY value synchronously — UI behavior is unchanged.
 *   2. Fires a non-blocking SSoT lookup via TierService.
 *   3. Records the comparison in the metrics collector.
 *
 * Failures are swallowed. This layer must NEVER affect user-facing flows.
 */
import { isVip as ssotIsVip, getSubscriptionTier } from "./TierService";
import { recordComparison } from "./metrics";

export type WrapContext = {
  userId: string | null | undefined;
  module: string;
};

/** Wrap a legacy boolean VIP decision. Returns the legacy value unchanged. */
export function wrapVipCheck(legacy: boolean, ctx: WrapContext): boolean {
  try {
    if (ctx.userId) {
      void ssotIsVip(ctx.userId)
        .then((ssot) => {
          recordComparison({
            module: ctx.module,
            userId: ctx.userId ?? null,
            legacy,
            ssot,
            mismatch: legacy !== ssot,
          });
        })
        .catch(() => {
          /* swallow */
        });
    }
  } catch {
    /* swallow */
  }
  return legacy;
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
        .catch(() => {
          /* swallow */
        });
    }
  } catch {
    /* swallow */
  }
  return legacy;
}
