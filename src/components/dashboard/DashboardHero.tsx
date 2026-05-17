import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Coins, ShoppingBag, GraduationCap, Tags, ArrowUpRight, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TierInfo } from "@/components/UserBadges";
import { RankBadge, RankXpBar } from "@/components/gamification/RankBadge";

type Profile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  global_subscription_tier_id?: string | null;
};

interface Props {
  userId: string;
  email: string | null;
  profile: Profile | null;
}

export function DashboardHero({ userId, email, profile }: Props) {
  const [tier, setTier] = useState<TierInfo>(null);
  const [points, setPoints] = useState<number>(0);
  const [pointsPerNis, setPointsPerNis] = useState<number>(100);
  const [kpis, setKpis] = useState({ orders: 0, courses: 0, listings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const tierId = profile?.global_subscription_tier_id ?? null;
      const [tierRes, ptsRes, settingsRes, ordersRes, coursesRes, listingsRes] = await Promise.all([
        tierId
          ? (supabase as any)
              .from("subscription_tiers")
              .select("id, slug, name, color, is_vip")
              .eq("id", tierId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("user_points").select("total_points").eq("user_id", userId).maybeSingle(),
        (supabase as any).from("points_settings").select("points_per_nis").eq("id", 1).maybeSingle(),
        (supabase as any)
          .from("shop_orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", userId),
        (supabase as any)
          .from("academy_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("completed_at", null),
        (supabase as any)
          .from("marketplace_listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", userId)
          .eq("status", "approved"),
      ]);

      if (!active) return;
      setTier((tierRes?.data as TierInfo) ?? null);
      setPoints(((ptsRes.data as any)?.total_points ?? 0) as number);
      const per = (settingsRes?.data as any)?.points_per_nis;
      setPointsPerNis(typeof per === "number" && per > 0 ? per : 100);
      setKpis({
        orders: (ordersRes as any)?.count ?? 0,
        courses: (coursesRes as any)?.count ?? 0,
        listings: (listingsRes as any)?.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, profile?.global_subscription_tier_id]);

  const initials = (profile?.display_name || email || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isVip = !!tier?.is_vip;
  const tierName = tier?.name ?? "חינם";
  const tierSlug = tier?.slug ?? "free";
  const nisEquivalent = pointsPerNis > 0 ? (points / pointsPerNis).toFixed(2) : "0.00";

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 shadow-2xl md:p-8"
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(245,158,11,0.45), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.35), transparent)" }}
      />

      {/* Top: identity + tier */}
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-xl font-bold text-zinc-950">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-zinc-50 md:text-3xl">
                {profile?.display_name || "המשתמש שלי"}
              </h1>
              {tier && tierSlug !== "free" && (
                <Badge
                  className={`gap-1 border px-2 py-0.5 text-xs ${
                    isVip
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-200"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  {tierName}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">
              {profile?.username ? `@${profile.username}` : email}
            </p>
            <div className="mt-2">
              <RankBadge points={points} size="sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row md:items-center">
          {!isVip && (
            <Button
              asChild
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500"
            >
              <Link to="/shop">
                <Crown className="ml-2 h-4 w-4" />
                שדרג מנוי
              </Link>
            </Button>
          )}
          {isVip && (
            <Badge className="justify-center gap-1 border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-300">
              <Crown className="h-4 w-4" />
              חבר VIP פעיל
            </Badge>
          )}
        </div>
      </div>

      {/* Points card */}
      <div className="relative mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-500/20 bg-zinc-950/60 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Coins className="h-5 w-5" />
              <span className="text-sm font-semibold">הנקודות שלי</span>
            </div>
            <a
              href="#points-info"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              איך מרוויחים נקודות?
            </a>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-50">
              {loading ? "—" : points.toLocaleString("he-IL")}
            </span>
            <span className="text-sm text-zinc-400">נקודות</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            ≈ <span className="text-amber-300">₪{nisEquivalent}</span> · יחס המרה {pointsPerNis} נק׳ = ₪1
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/10 bg-zinc-950/60 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold">המנוי שלי</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-50">{tierName}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {isVip ? "גישה מלאה להטבות פרימיום" : "שדרג כדי לפתוח הנחות והטבות"}
          </div>
        </div>
      </div>

      {/* XP / Rank progress */}
      <div className="relative mt-6">
        <RankXpBar points={points} />
      </div>

      {/* KPI strip */}
      <div className="relative mt-6 grid grid-cols-3 gap-3">
        <KpiTile
          icon={<ShoppingBag className="h-4 w-4" />}
          label="הזמנות"
          value={kpis.orders}
          loading={loading}
        />
        <KpiTile
          icon={<GraduationCap className="h-4 w-4" />}
          label="קורסים פעילים"
          value={kpis.courses}
          loading={loading}
        />
        <KpiTile
          icon={<Tags className="h-4 w-4" />}
          label="מודעות פעילות"
          value={kpis.listings}
          loading={loading}
        />
      </div>
    </section>
  );
}

function KpiTile({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 transition hover:border-amber-500/30">
      <div className="flex items-center justify-between text-zinc-400">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          {icon}
          {label}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-50">
        {loading ? "—" : value.toLocaleString("he-IL")}
      </div>
    </div>
  );
}
