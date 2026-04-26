import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, ShieldCheck, BadgeCheck, Sparkles } from "lucide-react";

type AppRole = "user" | "member" | "premium" | "vip" | "admin";

type Cache = { roles: AppRole[]; points: number };
const cache = new Map<string, Promise<Cache>>();

function fetchUserMeta(userId: string): Promise<Cache> {
  if (cache.has(userId)) return cache.get(userId)!;
  const p = (async () => {
    const [{ data: roles }, { data: pts }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("user_points").select("total_points").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      roles: ((roles ?? []) as { role: AppRole }[]).map(r => r.role),
      points: (pts as any)?.total_points ?? 0,
    };
  })();
  cache.set(userId, p);
  return p;
}

export function clearUserBadgeCache(userId?: string) {
  if (userId) cache.delete(userId); else cache.clear();
}

export function useUserBadges(userId: string | null | undefined) {
  const [data, setData] = useState<Cache | null>(null);
  useEffect(() => {
    if (!userId) { setData(null); return; }
    let active = true;
    fetchUserMeta(userId).then(d => { if (active) setData(d); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  return data;
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
  const isVip = data.roles.includes("vip");
  const isPremium = data.roles.includes("premium");
  const isMember = data.roles.includes("member");

  const iconSize = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {isAdmin && (
        <Badge variant="secondary" className={`gap-0.5 px-1.5 py-0 ${textSize} bg-emerald-500/15 text-emerald-300 border-emerald-500/30`}>
          <ShieldCheck className={iconSize} />
          אדמין
        </Badge>
      )}
      {isVip && (
        <Badge variant="secondary" className={`gap-0.5 px-1.5 py-0 ${textSize} bg-purple-500/15 text-purple-300 border-purple-500/30`}>
          <Crown className={iconSize} />
          VIP
        </Badge>
      )}
      {isPremium && !isVip && (
        <Badge variant="secondary" className={`gap-0.5 px-1.5 py-0 ${textSize} bg-amber-500/15 text-amber-300 border-amber-500/30`}>
          <BadgeCheck className={iconSize} />
        </Badge>
      )}
      {isMember && !isPremium && !isVip && !isAdmin && (
        <Badge variant="outline" className={`gap-0.5 px-1.5 py-0 ${textSize}`}>
          <Star className={iconSize} />
        </Badge>
      )}
      {showPoints && data.points > 0 && (
        <Badge variant="outline" className={`gap-0.5 px-1.5 py-0 ${textSize} text-muted-foreground`}>
          <Sparkles className={iconSize} />
          {data.points}
        </Badge>
      )}
    </span>
  );
}
