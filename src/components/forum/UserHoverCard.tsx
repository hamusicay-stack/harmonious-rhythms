import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserBadges, useUserBadges } from "@/components/UserBadges";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, MessageSquare, ExternalLink } from "lucide-react";

type MiniUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ProfileMeta = {
  forum_rank: string | null;
  forum_reputation: number | null;
  forum_post_count: number | null;
};

const profileCache = new Map<string, Promise<ProfileMeta | null>>();

function fetchProfileMeta(userId: string): Promise<ProfileMeta | null> {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  const p = (async () => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("forum_rank, forum_reputation, forum_post_count")
      .eq("id", userId)
      .maybeSingle();
    return (data as ProfileMeta) ?? null;
  })();
  profileCache.set(userId, p);
  return p;
}

export function UserHoverCard({
  user,
  size = "sm",
  showName = false,
  className,
}: {
  user: MiniUser | null | undefined;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
  className?: string;
}) {
  if (!user) return null;
  const name = user.display_name || user.username || "משתמש";
  const initials = name.slice(0, 2).toUpperCase();
  const avatarSize = size === "xs" ? "h-6 w-6" : size === "md" ? "h-10 w-10" : "h-8 w-8";

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link
          to={user.username ? "/u/$username" : "/forum"}
          params={user.username ? { username: user.username } : (undefined as never)}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-2 hover:opacity-90 transition-opacity ${className ?? ""}`}
        >
          <Avatar className={`${avatarSize} ring-1 ring-border`}>
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={name} />}
            <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
          </Avatar>
          {showName && <span className="text-xs font-medium truncate max-w-[120px]">{name}</span>}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 p-0 overflow-hidden">
        <HoverCardBody user={user} name={name} initials={initials} />
      </HoverCardContent>
    </HoverCard>
  );
}

function HoverCardBody({ user, name, initials }: { user: MiniUser; name: string; initials: string }) {
  const badges = useUserBadges(user.id);
  const [meta, setMeta] = useState<ProfileMeta | null>(null);

  useEffect(() => {
    let active = true;
    fetchProfileMeta(user.id).then((m) => {
      if (active) setMeta(m);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  return (
    <div className="bg-gradient-to-b from-card to-background">
      {/* Header strip with tier accent color */}
      <div
        className="h-14 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
        style={badges?.tier?.color ? { background: `linear-gradient(90deg, ${badges.tier.color}33, transparent)` } : undefined}
      />
      <div className="p-4 -mt-8">
        <div className="flex items-end gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-background">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={name} />}
            <AvatarFallback className="bg-muted text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pb-1">
            <div className="font-semibold truncate">{name}</div>
            {user.username && <div className="text-xs text-muted-foreground truncate">@{user.username}</div>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <UserBadges userId={user.id} size="sm" showPoints />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="h-3 w-3" />
              דירוג
            </div>
            <div className="font-semibold mt-0.5 truncate">{meta?.forum_rank || "—"}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              הודעות
            </div>
            <div className="font-semibold mt-0.5">{meta?.forum_post_count ?? 0}</div>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full mt-3 min-h-[36px]">
          {user.username ? (
            <Link to="/u/$username" params={{ username: user.username }}>
              <ExternalLink className="h-3.5 w-3.5 ms-1" />
              פרופיל מלא
            </Link>
          ) : (
            <span>פרופיל לא זמין</span>
          )}
        </Button>
      </div>
    </div>
  );
}
