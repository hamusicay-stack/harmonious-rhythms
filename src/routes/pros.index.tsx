import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Sparkles, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProCard, type ProCardData } from "@/components/pros/ProCard";
import { ProListItem } from "@/components/pros/ProListItem";
import { ProFilters, DEFAULT_FILTERS, type ProFiltersState } from "@/components/pros/ProFilters";
import { RequestQuoteDialog } from "@/components/pros/RequestQuoteDialog";
import { fetchVipUserIds } from "@/lib/tiers";

export const Route = createFileRoute("/pros/")({
  head: () => ({
    meta: [
      { title: "אינדקס מוזיקאים — המוזיקאי" },
      { name: "description", content: "מצא קלידן, זמר, מעבד או טכנאי לכל אירוע ופרויקט." },
      { property: "og:title", content: "אינדקס מוזיקאים — המוזיקאי" },
      { property: "og:description", content: "מצא קלידן, זמר, מעבד או טכנאי לכל אירוע ופרויקט." },
    ],
  }),
  component: ProsIndex,
});

type SortMode = "relevance" | "newest" | "rating" | "price_low";
type ViewMode = "grid" | "list";

function ProsIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pros, setPros] = useState<ProCardData[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProFiltersState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortMode>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [quoteFor, setQuoteFor] = useState<ProCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("music_pros")
        .select("id,user_id,display_name,headline,profile_image,cover_image,brand_color,hourly_price_min,region,cities,specialties,genres,is_verified,subscription_tier,is_featured,created_at")
        .eq("status", "approved");
      if (cancelled) return;
      if (error) console.error(error);
      const rawList = (data as (ProCardData & { created_at: string })[]) ?? [];
      // Unified tier: derive VIP from profiles.global_subscription_tier_id → subscription_tiers.is_vip
      const vipUserIds = await fetchVipUserIds(rawList.map((p) => p.user_id));
      const list = rawList.map((p) => ({
        ...p,
        subscription_tier: vipUserIds.has(p.user_id) ? "vip" : "free",
      }));
      setPros(list);

      // Fetch all approved reviews in one query for ranking
      if (list.length > 0) {
        const { data: revs } = await supabase
          .from("music_pro_reviews")
          .select("pro_id,rating")
          .in("pro_id", list.map((p) => p.id))
          .eq("is_approved", true);
        const map: Record<string, { sum: number; count: number }> = {};
        (revs ?? []).forEach((r: any) => {
          if (!map[r.pro_id]) map[r.pro_id] = { sum: 0, count: 0 };
          map[r.pro_id].sum += r.rating;
          map[r.pro_id].count += 1;
        });
        const finalRatings: Record<string, { avg: number; count: number }> = {};
        Object.entries(map).forEach(([k, v]) => {
          finalRatings[k] = { avg: v.sum / v.count, count: v.count };
        });
        setRatings(finalRatings);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const list = pros.filter((p) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${p.display_name} ${p.headline ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.specialties.length > 0 && !filters.specialties.some((s) => p.specialties.includes(s))) return false;
      if (filters.genres.length > 0 && !filters.genres.some((g) => p.genres.includes(g))) return false;
      if (filters.region && p.region !== filters.region) return false;
      if (filters.city && !p.cities.some((c) => c.includes(filters.city))) return false;
      if (filters.priceMax < 20000 && p.hourly_price_min != null && p.hourly_price_min > filters.priceMax) return false;
      if (filters.verifiedOnly && !p.is_verified) return false;
      if (filters.vipOnly && p.subscription_tier !== "vip") return false;
      return true;
    });

    // Sort
    const tierWeight = (t: string) => (t === "vip" ? 2 : 0);
    list.sort((a: any, b: any) => {
      if (sort === "relevance") {
        // VIP first → featured → rating avg → review count → newest
        const tw = tierWeight(b.subscription_tier) - tierWeight(a.subscription_tier);
        if (tw !== 0) return tw;
        const fw = (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        if (fw !== 0) return fw;
        const ra = ratings[a.id]?.avg ?? 0;
        const rb = ratings[b.id]?.avg ?? 0;
        if (rb !== ra) return rb - ra;
        const ca = ratings[a.id]?.count ?? 0;
        const cb = ratings[b.id]?.count ?? 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sort === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sort === "rating") {
        const ra = ratings[a.id]?.avg ?? 0;
        const rb = ratings[b.id]?.avg ?? 0;
        return rb - ra;
      }
      if (sort === "price_low") {
        return (a.hourly_price_min ?? Infinity) - (b.hourly_price_min ?? Infinity);
      }
      return 0;
    });
    return list;
  }, [pros, filters, sort, ratings]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 text-right">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> חדש בלוח
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            אינדקס <span className="text-gradient-gold">המוזיקאים</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            מצא קלידן, זמר, מעבד או טכנאי — שלח בקשת הצעת מחיר ישירות.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: user ? "/pros/new" : "/auth" })}
          size="lg"
          className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
        >
          <Plus className="ml-2 h-4 w-4" /> הצג את עצמי כמוזיקאי
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ProFilters value={filters} onChange={setFilters} />
        </aside>

        <div>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card p-2 px-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filtered.length} מוזיקאים</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="relevance">הרלוונטי ביותר</option>
                <option value="rating">דירוג גבוה</option>
                <option value="newest">חדשים ביותר</option>
                <option value="price_low">מחיר: נמוך לגבוה</option>
              </select>
              <div className="flex overflow-hidden rounded-md border border-input">
                <button
                  onClick={() => setView("grid")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  aria-label="תצוגת רשת"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  aria-label="תצוגת רשימה"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <p className="text-muted-foreground">לא נמצאו מוזיקאים התואמים לסינון.</p>
              {pros.length === 0 && (
                <Link to="/pros/new" className="mt-4 inline-block text-primary hover:underline">
                  היה הראשון להירשם →
                </Link>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((pro) => (
                <ProCard
                  key={pro.id}
                  pro={pro}
                  onRequestQuote={() => setQuoteFor(pro)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pro) => (
                <ProListItem
                  key={pro.id}
                  pro={pro}
                  onRequestQuote={() => setQuoteFor(pro)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {quoteFor && (
        <RequestQuoteDialog
          open={!!quoteFor}
          onOpenChange={(v) => !v && setQuoteFor(null)}
          proId={quoteFor.id}
          proName={quoteFor.display_name}
        />
      )}
    </div>
  );
}
