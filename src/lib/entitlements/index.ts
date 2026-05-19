/**
 * Shadow Entitlement Layer — public barrel.
 *
 * Phase 5 (Authority Stabilization): mode is server-controlled via the
 * `entitlement_control_plane` table. Browsers can read the mode but no
 * longer hold authority over it.
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
export {
  resolveEntitlement,
  getEntitlementMode,
  setEntitlementMode,
  getDriftSnapshot,
  onEntitlementDrift,
} from "./resolveEntitlement";
export type {
  EntitlementMode,
  Recommendation,
  DriftSnapshot,
  ResolveArgs,
  ResolveResult,
} from "./resolveEntitlement";
export {
  getEntitlementControlPlane,
  getCachedControlPlane,
  subscribeToControlPlaneChanges,
  setEntitlementMode as setEntitlementModeOnServer,
  updateControlPlane,
} from "./controlPlane";
export type { ControlPlaneConfig } from "./controlPlane";
export { getEntitlementHealth } from "./health";
export type { EntitlementHealth } from "./health";
export { getCacheMetrics } from "./cache";
export { getRateLimitMetrics } from "./rateLimit";
export { getAnomalyMetrics, onAnomaly, isSafetyMode } from "./anomalyDetector";
export type { AnomalyEvent, AnomalyType } from "./anomalyDetector";
