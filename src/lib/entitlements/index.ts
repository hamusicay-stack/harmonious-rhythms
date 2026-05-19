/**
 * Shadow Entitlement Layer — public barrel.
 *
 * Phase 2: this layer runs in PARALLEL with legacy logic. Importing from
 * here does not change any existing behavior; it only adds SSoT-based
 * resolution + optional divergence logging.
 *
 * Enable verbose logs in the browser console with:
 *   localStorage.setItem("entitlements:debug", "1")
 */
export * from "./TierService";
export { default as TierService } from "./TierService";
export { compareEntitlements } from "./compareEntitlements";
export type { EntitlementComparison } from "./compareEntitlements";
export { wrapVipCheck, wrapTierCheck } from "./dualRun";
export type { WrapContext } from "./dualRun";
export {
  recordComparison,
  getEntitlementMismatchReport,
  resetEntitlementMetrics,
} from "./metrics";
export type {
  EntitlementMismatchReport,
  MismatchRecord,
} from "./metrics";
