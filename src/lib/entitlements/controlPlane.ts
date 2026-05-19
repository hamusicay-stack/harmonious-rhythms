/**
 * Authority Stabilization Layer — server-driven entitlement control plane.
 *
 * Mode is no longer controlled via localStorage. The single source of truth
 * lives in the `entitlement_control_plane` table. This module fetches and
 * caches that config in-memory (short TTL) and exposes a realtime
 * subscription so resolveEntitlement can react instantly to admin changes.
 *
 * If Supabase is unreachable we fall back to a safe "dual" config so
 * entitlement evaluation never blocks users.
 */
import { supabase } from "@/integrations/supabase/client";
import { swrFetch, getCachedValue, setLastGood, getLastGood } from "./cache";
import { allowControlPlaneFetch, allowAdminModeSwitch } from "./rateLimit";
import { isSafetyMode, recordModeChange } from "./anomalyDetector";

export type EntitlementMode = "legacy" | "dual" | "ssot";

export type ControlPlaneConfig = {
  id: string | null;
  mode: EntitlementMode;
  rollout_percentage: number;
  allow_auto_rollback: boolean;
  drift_threshold_warning: number;
  drift_threshold_rollback: number;
  confidence_threshold_ssot: number;
  updated_by: string | null;
  updated_at: string | null;
};

const FALLBACK: ControlPlaneConfig = {
  id: null,
  mode: "dual",
  rollout_percentage: 0,
  allow_auto_rollback: false,
  drift_threshold_warning: 0.05,
  drift_threshold_rollback: 0.15,
  confidence_threshold_ssot: 0.7,
  updated_by: null,
  updated_at: null,
};

const CACHE_KEY = "entitlement_control_plane";
const TTL_MS = 8_000;
const listeners = new Set<(c: ControlPlaneConfig) => void>();

function notify(c: ControlPlaneConfig) {
  for (const l of listeners) {
    try { l(c); } catch { /* swallow */ }
  }
}

async function rawLoad(): Promise<ControlPlaneConfig> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: boolean) => {
          maybeSingle: () => Promise<{ data: ControlPlaneConfig | null; error: unknown }>;
        };
      };
    };
  })
    .from("entitlement_control_plane")
    .select(
      "id, mode, rollout_percentage, allow_auto_rollback, drift_threshold_warning, drift_threshold_rollback, confidence_threshold_ssot, updated_by, updated_at",
    )
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new Error("control_plane_load_failed");
  setLastGood(CACHE_KEY, data);
  notify(data);
  return data;
}

/** Synchronous read of last cached config (never throws). */
export function getCachedControlPlane(): ControlPlaneConfig {
  return (
    getCachedValue<ControlPlaneConfig>(CACHE_KEY) ??
    getLastGood<ControlPlaneConfig>(CACHE_KEY, FALLBACK)
  );
}

/** Fetch (or return cached) config. Always resolves — falls back on error. */
export async function getEntitlementControlPlane(
  opts: { force?: boolean } = {},
): Promise<ControlPlaneConfig> {
  // Per-system rate limit on control plane reads. Exceeded → serve cached.
  if (!opts.force && !allowControlPlaneFetch()) {
    return getCachedControlPlane();
  }
  const ttl = isSafetyMode() ? 30_000 : TTL_MS;
  return swrFetch<ControlPlaneConfig>(CACHE_KEY, rawLoad, {
    ttlMs: ttl,
    fallback: FALLBACK,
    force: opts.force,
  });
}

/** Subscribe to changes. Fires on every successful fetch / realtime update. */
export function subscribeToControlPlaneChanges(
  listener: (c: ControlPlaneConfig) => void,
): () => void {
  listeners.add(listener);
  let channel: { unsubscribe?: () => void } | null = null;
  try {
    channel = (supabase as unknown as {
      channel: (n: string) => {
        on: (
          ev: string,
          opts: Record<string, unknown>,
          cb: () => void,
        ) => { subscribe: () => { unsubscribe: () => void } };
      };
    })
      .channel("entitlement_control_plane")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entitlement_control_plane" },
        () => {
          void getEntitlementControlPlane({ force: true });
        },
      )
      .subscribe();
  } catch {
    /* realtime optional */
  }
  return () => {
    listeners.delete(listener);
    try { channel?.unsubscribe?.(); } catch { /* swallow */ }
  };
}

async function logAudit(
  action_type: "mode_change" | "config_change" | "drift_event" | "rollback_recommendation",
  payload: {
    previous_mode?: string | null;
    new_mode?: string | null;
    metadata?: Record<string, unknown>;
    actor_id?: string | null;
  },
) {
  try {
    await (supabase as unknown as {
      from: (t: string) => {
        insert: (r: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    })
      .from("entitlement_audit_log")
      .insert({
        action_type,
        previous_mode: payload.previous_mode ?? null,
        new_mode: payload.new_mode ?? null,
        metadata: payload.metadata ?? {},
        actor_id: payload.actor_id ?? null,
      });
  } catch {
    /* audit best-effort */
  }
}

/** Admin: change the active mode. Writes audit log. */
export async function setEntitlementMode(
  mode: EntitlementMode,
  adminId: string | null,
): Promise<ControlPlaneConfig> {
  if (!allowAdminModeSwitch(adminId)) {
    throw new Error("Rate limit: too many mode switches. Try again in a minute.");
  }
  const prev = await getEntitlementControlPlane({ force: true });
  if (!prev.id) throw new Error("Control plane row missing");
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      update: (r: Record<string, unknown>) => {
        eq: (k: string, v: string) => {
          select: () => { maybeSingle: () => Promise<{ data: ControlPlaneConfig | null; error: unknown }> };
        };
      };
    };
  })
    .from("entitlement_control_plane")
    .update({ mode, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq("id", prev.id)
    .select()
    .maybeSingle();
  if (error || !data) throw new Error("Failed to update mode");
  setLastGood(CACHE_KEY, data);
  notify(data);
  recordModeChange(mode);
  // Force refresh so all readers pick up immediately.
  void getEntitlementControlPlane({ force: true });
  await logAudit("mode_change", {
    previous_mode: prev.mode,
    new_mode: mode,
    actor_id: adminId,
    metadata: { source: "admin_ui" },
  });
  return data;
}

/** Admin: bulk update config fields. */
export async function updateControlPlane(
  patch: Partial<Omit<ControlPlaneConfig, "id" | "updated_at" | "updated_by">>,
  adminId: string | null,
): Promise<ControlPlaneConfig> {
  const prev = await getEntitlementControlPlane({ force: true });
  if (!prev.id) throw new Error("Control plane row missing");
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      update: (r: Record<string, unknown>) => {
        eq: (k: string, v: string) => {
          select: () => { maybeSingle: () => Promise<{ data: ControlPlaneConfig | null; error: unknown }> };
        };
      };
    };
  })
    .from("entitlement_control_plane")
    .update({ ...patch, updated_by: adminId, updated_at: new Date().toISOString() })
    .eq("id", prev.id)
    .select()
    .maybeSingle();
  if (error || !data) throw new Error("Failed to update control plane");
  setLastGood(CACHE_KEY, data);
  notify(data);
  void getEntitlementControlPlane({ force: true });
  await logAudit("config_change", {
    previous_mode: prev.mode,
    new_mode: data.mode,
    actor_id: adminId,
    metadata: { patch },
  });
  return data;
}

/** Log a drift / rollback recommendation event (called by resolveEntitlement). */
export async function logDriftEvent(metadata: Record<string, unknown>): Promise<void> {
  await logAudit("drift_event", { metadata });
}

export async function logRollbackRecommendation(metadata: Record<string, unknown>): Promise<void> {
  await logAudit("rollback_recommendation", { metadata });
}

// Kick off an initial fetch on module load (best-effort, non-blocking).
if (typeof window !== "undefined") {
  void getEntitlementControlPlane().catch(() => { /* swallow */ });
}
