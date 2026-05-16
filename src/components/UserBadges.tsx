import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, BadgeCheck, Sparkles, Star } from "lucide-react";

type AppRole = "user" | "member" | "premium" | "vip" | "admin";

export type TierInfo = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  is_vip: boolean;
} | null;

type Cache = {
  roles: AppRole[];
  points: number;
  tier: TierInfo;
};

const cache = new Map<string, Promise<Cache>>();

async function fetchTierForProfile(globalTierId: string | null | undefined): Promise<TierInfo> {
  if (!globalTierId) return null;
  const { data } = await (supabase as any)
    .from("subscription_tiers")
    .select("id, slug, name, color, is_vip")
    .eq("id", globalTierId)
    .maybeSingle();
  return (data as TierInfo) ?? null;
}

function fetchUserMeta(userId: string): Promise<Cache> {
  if (cache.has(userId)) return cache.get(userId)!;
  const p = (async () => {
    const [{ data: roles }, { data: pts }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("user_points").select("total_points").eq("user_id", userId).maybeSingle(),
      (supabase as any).from("profiles").select("global_subscription_tier_id").eq("id", userId).maybeSingle(),
    ]);
    const tier = await fetchTierForProfile(prof?.global_subscription_tier_id);
    return {
      roles: ((roles ?? []) as { role: AppRole }[]).map((r) => r.role),
      points: (pts as any)?.total_points ?? 0,
      tier,
    };
  })();
  cache.set(userId, p);
  return p;
}

export function clearUserBadgeCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export function useUserBadges(userId: string | null | undefined) {
  const [data, setData] = useState<Cache | null>(null);
  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    let active = true;
    fetchUserMeta(userId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);
  return data;
}

function tierColorClasses(color: string | null | undefined, is_vip: boolean): string {
  const c = (color ?? "").toLowerCase();
  if (is_vip || c === "gold")
    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (c === "blue") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (c === "purple") return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  return "bg-muted/40 text-muted-foreground border-border";
}

export function UserBadges({
  userId,
  size = "sm",
  showPoints = true,
}: {
  userId: string | null | undefined;
  size?: "xs" | "sm";
  showPoints?: boolean;
}) {
  const data = useUserBadges(userId);
  if (!userId || !data) return null;

  const isAdmin = data.roles.includes("admin");
  const tier = data.tier;
  const isVip = !!tier?.is_vip;

  const iconSize = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {isAdmin && (
        <Badge
          variant="secondary"
          className={`gap-0.5 px-1.5 py-0 ${textSize} bg-emerald-500/15 text-emerald-300 border-emerald-500/30`}
        >
          <ShieldCheck className={iconSize} />
          אדמין
        </Badge>
      )}
      {tier && tier.slug !== "free" && (
        <Badge
          variant="secondary"
          className={`gap-0.5 px-1.5 py-0 ${textSize} ${tierColorClasses(tier.color, tier.is_vip)}`}
        >
          {isVip ? <Crown className={iconSize} /> : <BadgeCheck className={iconSize} />}
          {tier.name}
        </Badge>
      )}
      {(!tier || tier.slug === "free") && !isAdmin && (
        <Badge variant="outline" className={`gap-0.5 px-1.5 py-0 ${textSize}`}>
          <Star className={iconSize} />
        </Badge>
      )}
      {showPoints && data.points > 0 && (
        <Badge
          variant="outline"
          className={`gap-0.5 px-1.5 py-0 ${textSize} text-muted-foreground`}
        >
          <Sparkles className={iconSize} />
          {data.points}
        </Badge>
      )}
    </span>
  );
}
