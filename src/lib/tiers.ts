// Central helpers for resolving VIP status from the unified
// `subscription_tiers` matrix via `profiles.global_subscription_tier_id`.
// Do NOT read legacy text columns like `music_pros.subscription_tier` or
// `marketplace_business_sellers.subscription_status` anymore.
import { supabase } from "@/integrations/supabase/client";

/** Return the set of userIds whose global tier has `is_vip = true`. */
export async function fetchVipUserIds(userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data: profs } = await (supabase as any)
    .from("profiles")
    .select("id, global_subscription_tier_id")
    .in("id", ids);
  const tierIds = Array.from(new Set(
    (profs ?? []).map((p: any) => p.global_subscription_tier_id).filter(Boolean),
  )) as string[];
  if (tierIds.length === 0) return new Set();
  const { data: tiers } = await (supabase as any)
    .from("subscription_tiers")
    .select("id, is_vip")
    .in("id", tierIds);
  const vipTierIds = new Set(
    (tiers ?? []).filter((t: any) => t.is_vip).map((t: any) => t.id),
  );
  const out = new Set<string>();
  for (const p of (profs ?? []) as any[]) {
    if (p.global_subscription_tier_id && vipTierIds.has(p.global_subscription_tier_id)) {
      out.add(p.id);
    }
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
  const { data: prof } = await (supabase as any)
    .from("profiles")
    .select("global_subscription_tier_id")
    .eq("id", userId)
    .maybeSingle();
  const tierId = prof?.global_subscription_tier_id;
  if (!tierId) return 0;
  const { data: tier } = await (supabase as any)
    .from("subscription_tiers")
    .select("academy_discount_percent")
    .eq("id", tierId)
    .maybeSingle();
  const pct = tier?.academy_discount_percent;
  return typeof pct === "number" ? pct : 0;
}
