/**
 * Shadow Entitlement Layer — TierService
 * --------------------------------------
 * Centralized, SSoT-only resolver for subscription tier + VIP status.
 *
 * SSoT: profiles.global_subscription_tier_id → subscription_tiers.is_vip
 *
 * IMPORTANT (Phase 2):
 *  - This service is the future single source of truth for entitlement reads.
 *  - It runs in PARALLEL with all legacy logic. Legacy callers are NOT
 *    modified or removed in this phase.
 *  - All resolution paths log a structured trace so we can audit divergence
 *    between legacy reads (`profiles.subscription_tier`,
 *    `music_pros.subscription_tier`) and the SSoT.
 */
import { supabase } from "@/integrations/supabase/client";

export type ResolvedTier = {
  id: string;
  slug: string;
  name: string;
  rank: number;
  is_vip: boolean;
  color: string | null;
} | null;

export type EntitlementSource =
  | "ssot:profiles.global_subscription_tier_id"
  | "ssot:none"
  | "cache";

export type EntitlementTrace = {
  service: "TierService";
  fn: string;
  userId: string | null;
  source: EntitlementSource;
  is_vip: boolean;
  tier_slug: string | null;
  at: number;
};

const DEBUG =
  (typeof window !== "undefined" &&
    (window.localStorage?.getItem?.("entitlements:debug") === "1" ||
      (window as unknown as { __ENTITLEMENTS_DEBUG__?: boolean })
        .__ENTITLEMENTS_DEBUG__ === true));

function trace(t: EntitlementTrace) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug("[entitlements]", t);
}

// Tiny in-memory cache (per page load). Phase 2 is read-mostly; cache prevents
// the shadow layer from doubling DB load while running alongside legacy code.
const tierCache = new Map<string, Promise<ResolvedTier>>();
const TTL_MS = 60_000;
const tierCacheAt = new Map<string, number>();

function cacheGet(userId: string): Promise<ResolvedTier> | null {
  const at = tierCacheAt.get(userId);
  if (!at || Date.now() - at > TTL_MS) {
    tierCache.delete(userId);
    tierCacheAt.delete(userId);
    return null;
  }
  return tierCache.get(userId) ?? null;
}

function cacheSet(userId: string, p: Promise<ResolvedTier>) {
  tierCache.set(userId, p);
  tierCacheAt.set(userId, Date.now());
}

/** Invalidate cached entitlement state for a user (e.g. after tier change). */
export function invalidateTierCache(userId?: string) {
  if (userId) {
    tierCache.delete(userId);
    tierCacheAt.delete(userId);
    return;
  }
  tierCache.clear();
  tierCacheAt.clear();
}

/**
 * Resolve the user's current tier exclusively via SSoT.
 * Returns null if the user has no `global_subscription_tier_id` set.
 */
export async function getUserTier(
  userId: string | null | undefined,
): Promise<ResolvedTier> {
  if (!userId) {
    trace({
      service: "TierService",
      fn: "getUserTier",
      userId: null,
      source: "ssot:none",
      is_vip: false,
      tier_slug: null,
      at: Date.now(),
    });
    return null;
  }

  const cached = cacheGet(userId);
  if (cached) {
    const t = await cached;
    trace({
      service: "TierService",
      fn: "getUserTier",
      userId,
      source: "cache",
      is_vip: !!t?.is_vip,
      tier_slug: t?.slug ?? null,
      at: Date.now(),
    });
    return t;
  }

  const p = (async (): Promise<ResolvedTier> => {
    const { data: prof } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{
              data: { global_subscription_tier_id: string | null } | null;
            }>;
          };
        };
      };
    })
      .from("profiles")
      .select("global_subscription_tier_id")
      .eq("id", userId)
      .maybeSingle();

    const tierId = prof?.global_subscription_tier_id ?? null;
    if (!tierId) {
      trace({
        service: "TierService",
        fn: "getUserTier",
        userId,
        source: "ssot:none",
        is_vip: false,
        tier_slug: null,
        at: Date.now(),
      });
      return null;
    }

    const { data: t } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: ResolvedTier }>;
          };
        };
      };
    })
      .from("subscription_tiers")
      .select("id, slug, name, rank, is_vip, color")
      .eq("id", tierId)
      .maybeSingle();

    trace({
      service: "TierService",
      fn: "getUserTier",
      userId,
      source: "ssot:profiles.global_subscription_tier_id",
      is_vip: !!t?.is_vip,
      tier_slug: t?.slug ?? null,
      at: Date.now(),
    });
    return t ?? null;
  })();

  cacheSet(userId, p);
  return p;
}

/** Pure derivation — no I/O. Use when you already have a tier object. */
export function deriveIsVip(
  user: { tier?: ResolvedTier } | ResolvedTier | null | undefined,
): boolean {
  if (!user) return false;
  if ("is_vip" in user && typeof (user as { is_vip?: unknown }).is_vip === "boolean") {
    return !!(user as { is_vip: boolean }).is_vip;
  }
  const t = (user as { tier?: ResolvedTier }).tier ?? null;
  return !!t?.is_vip;
}

/** Convenience: tier slug ("free" if none set). */
export async function getSubscriptionTier(
  userId: string | null | undefined,
): Promise<string> {
  const t = await getUserTier(userId);
  return t?.slug ?? "free";
}

/** Convenience: boolean VIP check via SSoT. */
export async function isVip(userId: string | null | undefined): Promise<boolean> {
  const t = await getUserTier(userId);
  return deriveIsVip(t);
}

export const TierService = {
  getUserTier,
  deriveIsVip,
  getSubscriptionTier,
  isVip,
  invalidateTierCache,
};

export default TierService;
