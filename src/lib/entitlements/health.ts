/**
 * Phase 6 — Health surface for the entitlement system.
 * Exposed via window.__entitlementsHealth() for ad-hoc inspection and
 * consumed by the admin dashboard.
 */
import { getCacheMetrics } from "./cache";
import { getRateLimitMetrics } from "./rateLimit";
import { getAnomalyMetrics, isSafetyMode } from "./anomalyDetector";

export type EntitlementHealth = {
  cacheHitRate: number;
  avgLatency: number;
  anomalyCount: number;
  rateLimitHits: number;
  safetyModeStatus: boolean;
  status: "green" | "yellow" | "red";
  details: {
    cache: ReturnType<typeof getCacheMetrics>;
    rateLimit: ReturnType<typeof getRateLimitMetrics>;
    anomaly: ReturnType<typeof getAnomalyMetrics>;
  };
};

export function getEntitlementHealth(): EntitlementHealth {
  const cache = getCacheMetrics();
  const rate = getRateLimitMetrics();
  const anom = getAnomalyMetrics();
  const totalHits = rate.user + rate.controlPlane + rate.adminMode;

  let status: "green" | "yellow" | "red" = "green";
  if (isSafetyMode()) status = "red";
  else if (cache.avgLatencyMs > 800 || totalHits > 50 || anom.anomalyCount > 0) status = "yellow";

  return {
    cacheHitRate: cache.hitRate,
    avgLatency: cache.avgLatencyMs,
    anomalyCount: anom.anomalyCount,
    rateLimitHits: totalHits,
    safetyModeStatus: isSafetyMode(),
    status,
    details: { cache, rateLimit: rate, anomaly: anom },
  };
}

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__entitlementsHealth = getEntitlementHealth;
}
