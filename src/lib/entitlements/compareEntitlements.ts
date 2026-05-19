/**
 * Shadow Entitlement Layer — divergence detector.
 *
 * Runs the SSoT TierService side-by-side with the legacy text columns
 * (`profiles.subscription_tier`, `music_pros.subscription_tier`) and logs
 * any mismatch. Read-only. Never throws into the caller — every error is
 * swallowed and recorded so it can never break a legacy flow.
 */
import { supabase } from "@/integrations/supabase/client";
import { isVip as ssotIsVip, getSubscriptionTier } from "./TierService";

export type EntitlementComparison = {
  userId: string;
  legacy: {
    profile_tier_slug: string | null;
    profile_is_vip: boolean;
    music_pro_tier_slug: string | null;
    music_pro_is_vip: boolean;
  };
  ssot: {
    tier_slug: string;
    is_vip: boolean;
  };
  mismatch: {
    profile_vs_ssot: boolean;
    music_pro_vs_ssot: boolean;
    profile_vs_music_pro: boolean;
  };
  at: number;
};

const reportedKeys = new Set<string>();

function shouldLog(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage?.getItem?.("entitlements:debug") === "1" ||
    (window as unknown as { __ENTITLEMENTS_DEBUG__?: boolean })
      .__ENTITLEMENTS_DEBUG__ === true
  );
}

export async function compareEntitlements(
  userId: string | null | undefined,
): Promise<EntitlementComparison | null> {
  if (!userId) return null;
  try {
    const [{ data: prof }, { data: pro }, ssotSlug, ssotVip] = await Promise.all([
      (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{
                data: { subscription_tier: string | null } | null;
              }>;
            };
          };
        };
      })
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .maybeSingle(),
      (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{
                data: { subscription_tier: string | null } | null;
              }>;
            };
          };
        };
      })
        .from("music_pros")
        .select("subscription_tier")
        .eq("user_id", userId)
        .maybeSingle(),
      getSubscriptionTier(userId),
      ssotIsVip(userId),
    ]);

    const profileSlug = (prof?.subscription_tier ?? null) as string | null;
    const proSlug = (pro?.subscription_tier ?? null) as string | null;
    const profileIsVip = (profileSlug ?? "").toLowerCase() === "vip";
    const proIsVip = (proSlug ?? "").toLowerCase() === "vip";

    const result: EntitlementComparison = {
      userId,
      legacy: {
        profile_tier_slug: profileSlug,
        profile_is_vip: profileIsVip,
        music_pro_tier_slug: proSlug,
        music_pro_is_vip: proIsVip,
      },
      ssot: { tier_slug: ssotSlug, is_vip: ssotVip },
      mismatch: {
        profile_vs_ssot: profileIsVip !== ssotVip,
        music_pro_vs_ssot: pro !== null && proIsVip !== ssotVip,
        profile_vs_music_pro: pro !== null && profileIsVip !== proIsVip,
      },
      at: Date.now(),
    };

    const anyMismatch =
      result.mismatch.profile_vs_ssot ||
      result.mismatch.music_pro_vs_ssot ||
      result.mismatch.profile_vs_music_pro;

    if (anyMismatch && shouldLog()) {
      const key = `${userId}:${profileSlug}:${proSlug}:${ssotSlug}:${ssotVip}`;
      if (!reportedKeys.has(key)) {
        reportedKeys.add(key);
        // eslint-disable-next-line no-console
        console.warn("[entitlements:mismatch]", result);
      }
    } else if (shouldLog()) {
      // eslint-disable-next-line no-console
      console.debug("[entitlements:compare]", result);
    }

    return result;
  } catch (err) {
    if (shouldLog()) {
      // eslint-disable-next-line no-console
      console.debug("[entitlements:compare:error]", err);
    }
    return null;
  }
}
