import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProCard, type ProCardData } from "@/components/pros/ProCard";
import { ProFilters, DEFAULT_FILTERS, type ProFiltersState } from "@/components/pros/ProFilters";
import { RequestQuoteDialog } from "@/components/pros/RequestQuoteDialog";

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

function ProsIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pros, setPros] = useState<ProCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProFiltersState>(DEFAULT_FILTERS);
  const [quoteFor, setQuoteFor] = useState<ProCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("music_pros")
        .select("id,display_name,headline,profile_image,cover_image,brand_color,hourly_price_min,region,cities,specialties,genres,is_verified,subscription_tier,is_featured")
        .eq("status", "approved")
        .order("subscription_tier", { ascending: false })
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error(error);
      setPros((data as ProCardData[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return pros.filter((p) => {
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
  }, [pros, filters]);

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
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((pro) => (
                <ProCard
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
