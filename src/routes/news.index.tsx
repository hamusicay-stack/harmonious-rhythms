import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Sparkles, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "חדשות מוזיקה — סינגלים, אלבומים וסיקורי ציוד | המוזיקאי" },
      { name: "description", content: "מגזין חדשות המוזיקה של הקהילה — סינגלים חדשים, השקות אלבומים, סיקורי ציוד וראיונות בלעדיים." },
      { property: "og:title", content: "חדשות מוזיקה — מגזין הקהילה" },
      { property: "og:description", content: "סקירות, השקות וסיפורים מאחורי הצלילים." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <NewsIndexPage />
    </SiteLayout>
  ),
});

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  category: string;
  is_featured: boolean | null;
  views_count: number | null;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  singles: "סינגלים חדשים",
  albums: "השקות אלבומים",
  events: "אירועים",
  gear_reviews: "סיקורי ציוד",
  interviews: "ראיונות",
};

const labelFor = (c: string) => CATEGORY_LABELS[c] ?? c;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=70";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function NewsIndexPage() {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("music_news")
        .select("id,title,slug,summary,image_url,category,is_featured,views_count,created_at")
        .eq("approval_status", "approved")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setRows((data ?? []) as NewsRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => rows.find((r) => r.is_featured) ?? rows[0], [rows]);
  const restRows = useMemo(() => rows.filter((r) => r.id !== featured?.id), [rows, featured]);
  const filtered = useMemo(
    () => (activeCategory === "all" ? restRows : restRows.filter((r) => r.category === activeCategory)),
    [restRows, activeCategory],
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3 animate-fade-in">
          <Newspaper className="h-7 w-7 text-gold" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient-gold">
              מגזין החדשות
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              סקירות, השקות וסיפורים מאחורי הצלילים
            </p>
          </div>
        </div>

        {/* Hero featured */}
        {featured && (
          <Link
            to="/news/$slug"
            params={{ slug: featured.slug }}
            className="group relative block w-full overflow-hidden rounded-2xl ring-1 ring-gold/20 shadow-gold animate-fade-in"
          >
            <div className="relative aspect-[21/9] sm:aspect-[21/8] w-full overflow-hidden bg-black">
              <img
                src={featured.image_url || FALLBACK_IMAGE}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                <Badge
                  variant="outline"
                  className="mb-3 border-gold/60 text-gold bg-black/40 backdrop-blur-sm"
                >
                  <Sparkles className="h-3 w-3 ml-1" />
                  כתבה נבחרת · {labelFor(featured.category)}
                </Badge>
                <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-gradient-gold leading-tight max-w-3xl">
                  {featured.title}
                </h2>
                {featured.summary && (
                  <p className="mt-3 text-white/85 text-sm sm:text-base max-w-2xl line-clamp-2">
                    {featured.summary}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-white/70">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(featured.created_at)}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Filter pills — dynamic, scrollable */}
        <div className="mt-10 mb-6 -mx-2 px-2 flex gap-2 overflow-x-auto scrollbar-thin [scrollbar-width:thin] touch-pan-x">
          {(["all", ...Array.from(new Set(rows.map((r) => r.category))).filter(Boolean).sort()]).map((c) => {
            const isActive = activeCategory === c;
            return (
              <Button
                key={c}
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => setActiveCategory(c)}
                className={
                  "shrink-0 " +
                  (isActive
                    ? "rounded-full bg-gold text-gold-foreground hover:bg-gold/90 border-gold"
                    : "rounded-full border-gold/30 text-foreground hover:bg-gold/10 hover:text-gold hover:border-gold/60")
                }
              >
                {c === "all" ? "הכל" : labelFor(c)}
              </Button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            אין עדיין כתבות בקטגוריה הזו.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r, idx) => (
              <Link
                key={r.id}
                to="/news/$slug"
                params={{ slug: r.slug }}
                className="group relative flex flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-border hover:ring-gold/50 transition-all duration-300 hover-scale animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={r.image_url || FALLBACK_IMAGE}
                    alt={r.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <Badge
                    variant="outline"
                    className="absolute top-3 right-3 border-gold/60 text-gold bg-black/50 backdrop-blur-sm text-[10px]"
                  >
                    {labelFor(r.category)}
                  </Badge>
                </div>
                <div className="flex-1 flex flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight line-clamp-2 group-hover:text-gold transition-colors">
                    {r.title}
                  </h3>
                  {r.summary && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                      {r.summary}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(r.created_at)}
                    </span>
                    <span className="opacity-70">{r.views_count ?? 0} צפיות</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
