// Central helpers for resolving VIP status from the unified
// `subscription_tiers` matrix via `profiles.global_subscription_tier_id`.
// Do NOT read legacy text columns like `music_pros.subscription_tier` or
// `marketplace_business_sellers.subscription_status` anymore.
import { supabase } from "@/integrations/supabase/client";

/** Return the set of userIds whose global tier has `is_vip = true`. */
export async function fetchVipUserIds(userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data } = await (supabase as any)
    .from("profiles")
    .select("id, subscription_tiers!profiles_global_subscription_tier_id_fkey(is_vip)")
    .in("id", ids);
  const out = new Set<string>();
  for (const row of (data ?? []) as any[]) {
    if (row?.subscription_tiers?.is_vip) out.add(row.id);
  }
  return out;
}

/** Check if a single user has an active VIP tier. */
export async function isUserVip(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const set = await fetchVipUserIds([userId]);
  return set.has(userId);
}

/** Get the academy discount % for a user from their global tier (0 if none). */
export async function fetchAcademyDiscountPercent(userId: string | null | undefined): Promise<number> {
  if (!userId) return 0;
  const { data } = await (supabase as any)
    .from("profiles")
    .select("subscription_tiers!profiles_global_subscription_tier_id_fkey(academy_discount_percent)")
    .eq("id", userId)
    .maybeSingle();
  const pct = data?.subscription_tiers?.academy_discount_percent;
  return typeof pct === "number" ? pct : 0;
}
