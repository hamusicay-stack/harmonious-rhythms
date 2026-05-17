import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trophy, Crown, Medal } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RankBadge } from "@/components/gamification/RankBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "לוח הישגים — קהילת המוזיקאי" },
      { name: "description", content: "טופ הקהילה לפי נקודות וגיימיפיקציה." },
      { property: "og:title", content: "לוח הישגים — קהילת המוזיקאי" },
      { property: "og:description", content: "טופ הקהילה לפי נקודות וגיימיפיקציה." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  user_id: string;
  total_points: number;
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    global_subscription_tier_id: string | null;
  } | null;
  isVip: boolean;
};

function rowStyle(rank: number) {
  if (rank === 1)
    return {
      ring: "ring-2 ring-amber-400/60 shadow-[0_0_30px_-8px_rgba(245,158,11,0.6)]",
      badge: "bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950",
      label: "זהב",
      icon: Trophy,
    };
  if (rank === 2)
    return {
      ring: "ring-2 ring-zinc-300/60 shadow-[0_0_24px_-8px_rgba(212,212,216,0.5)]",
      badge: "bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-900",
      label: "כסף",
      icon: Medal,
    };
  if (rank === 3)
    return {
      ring: "ring-2 ring-orange-500/50 shadow-[0_0_24px_-8px_rgba(234,88,12,0.5)]",
      badge: "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950",
      label: "ארד",
      icon: Medal,
    };
  return {
    ring: "",
    badge: "bg-muted text-foreground",
    label: "",
    icon: null,
  };
}

function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: pts } = await (supabase as any)
        .from("user_points")
        .select("user_id, total_points")
        .order("total_points", { ascending: false })
        .limit(20);
      const points = (pts as { user_id: string; total_points: number }[]) ?? [];
      const ids = points.map((p) => p.user_id);

      const [profilesRes, tiersRes] = await Promise.all([
        ids.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url, global_subscription_tier_id")
              .in("id", ids)
          : Promise.resolve({ data: [] as never[] }),
        (supabase as any).from("subscription_tiers").select("id, is_vip"),
      ]);

      if (!alive) return;
      const profMap = new Map<string, Row["profile"]>();
      (profilesRes.data as any[] | null)?.forEach((p) => profMap.set(p.id, p as Row["profile"]));
      const vipTierIds = new Set(
        ((tiersRes?.data as { id: string; is_vip: boolean }[] | null) ?? [])
          .filter((t) => t.is_vip)
          .map((t) => t.id),
      );

      setRows(
        points.map((p) => {
          const profile = profMap.get(p.user_id) ?? null;
          const isVip = !!profile?.global_subscription_tier_id &&
            vipTierIds.has(profile.global_subscription_tier_id);
          return { user_id: p.user_id, total_points: p.total_points, profile, isVip };
        }),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-10" dir="rtl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-500/30">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">לוח ההישגים</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            20 חברי הקהילה המובילים — לפי נקודות גיימיפיקציה.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            עדיין אין נתונים. היה הראשון לצבור נקודות!
          </Card>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const rank = i + 1;
              const s = rowStyle(rank);
              const RankIcon = s.icon;
              const display = row.profile?.display_name ?? row.profile?.username ?? "משתמש";
              const initials = display.slice(0, 2).toUpperCase();
              return (
                <li key={row.user_id}>
                  <LeaderboardRowLink username={row.profile?.username}>
                    <Card
                      className={cn(
                        "flex items-center gap-3 p-3 transition hover:border-amber-500/40 sm:gap-4 sm:p-4",
                        s.ring,
                      )}
                    >
                      {/* Rank number / medal */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-12 sm:w-12 sm:text-base",
                          s.badge,
                        )}
                      >
                        {RankIcon ? <RankIcon className="h-5 w-5" /> : `#${rank}`}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-10 w-10 border border-border sm:h-12 sm:w-12">
                        <AvatarImage src={row.profile?.avatar_url ?? undefined} alt={display} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      {/* Identity */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-semibold">{display}</span>
                          {row.isVip && (
                            <span
                              title="חבר VIP"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                            >
                              <Crown className="h-3 w-3" />
                            </span>
                          )}
                          {s.label && (
                            <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                              {s.label}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <RankBadge points={row.total_points} size="xs" />
                          {row.profile?.username && (
                            <span className="text-xs text-muted-foreground">
                              @{row.profile.username}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 sm:text-xl">
                          {row.total_points.toLocaleString("he-IL")}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          XP
                        </div>
                      </div>
                    </Card>
                  </LeaderboardRowLink>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </SiteLayout>
  );
}

function LeaderboardRowLink({
  username,
  children,
}: {
  username: string | null | undefined;
  children: React.ReactNode;
}) {
  if (!username) return <>{children}</>;
  return (
    <Link to="/u/$username" params={{ username }} className="block">
      {children}
    </Link>
  );
}
