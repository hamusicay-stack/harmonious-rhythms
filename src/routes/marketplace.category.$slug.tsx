import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Tags, MapPin, ShieldCheck, Briefcase, ArrowUp, ArrowRight } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace/category/$slug")({
  loader: async ({ params }) => {
    const { data: cat } = await supabase
      .from("marketplace_categories")
      .select("slug, label, image_url, subcategories")
      .eq("slug", params.slug)
      .maybeSingle();
    return { category: cat };
  },
  head: ({ loaderData }) => {
    const label = loaderData?.category?.label ?? "קטגוריה";
    return {
      meta: [
        { title: `${label} — יד 2 | המוזיקאי` },
        { name: "description", content: `מודעות יד 2 בקטגוריית ${label}. כלי נגינה, ציוד הקלטה והגברה משומשים.` },
        { property: "og:title", content: `${label} — יד 2 | המוזיקאי` },
        { property: "og:description", content: `מודעות יד 2 בקטגוריית ${label}.` },
        ...(loaderData?.category?.image_url ? [{ property: "og:image", content: loaderData.category.image_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <ModulePlaceholder icon={Tags} title="קטגוריה לא נמצאה" subtitle="">
      <Link to="/marketplace" className="text-primary underline">חזרה לכל הקטגוריות</Link>
    </ModulePlaceholder>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <ModulePlaceholder icon={Tags} title="שגיאה" subtitle={error.message}>
        <Button onClick={() => { router.invalidate(); reset(); }}>נסה שוב</Button>
      </ModulePlaceholder>
    );
  },
  component: CategoryPage,
});

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  price: number;
  city: string | null;
  region: string | null;
  images: string[];
  seller_type: string;
  bump_expires_at: string | null;
};

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [businessSellers, setBusinessSellers] = useState<Set<string>>(new Set());
  const [trustedSellers, setTrustedSellers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: list }, { data: business }, { data: trusted }] = await Promise.all([
        supabase.from("marketplace_listings")
          .select("id, seller_id, title, subcategory, brand, model, price, city, region, images, seller_type, bump_expires_at")
          .eq("status", "approved")
          .eq("category", slug)
          .order("bump_expires_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_business_sellers").select("user_id").eq("subscription_status", "active"),
        supabase.from("marketplace_trusted_sellers").select("user_id"),
      ]);
      setListings((list ?? []) as Listing[]);
      setBusinessSellers(new Set((business ?? []).map((b: any) => b.user_id)));
      setTrustedSellers(new Set((trusted ?? []).map((t: any) => t.user_id)));
      setLoading(false);
    })();
  }, [slug]);

  const filtered = useMemo(
    () => activeSub ? listings.filter((l) => l.subcategory === activeSub) : listings,
    [listings, activeSub],
  );

  if (!category) {
    return (
      <ModulePlaceholder icon={Tags} title="קטגוריה לא נמצאה" subtitle="">
        <Link to="/marketplace" className="text-primary underline">חזרה לכל הקטגוריות</Link>
      </ModulePlaceholder>
    );
  }

  return (
    <ModulePlaceholder icon={Tags} title={category.label} subtitle={`${filtered.length} מודעות בקטגוריה`}>
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />חזרה ללוח הראשי
        </Link>
        <Link to="/marketplace/new"><Button>פרסם מודעה בקטגוריה</Button></Link>
      </div>

      {category.subcategories.length > 0 && (
        <div className="mb-6 rounded-2xl border bg-card p-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">סינון לפי סוג</Label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSub(null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${!activeSub ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
            >
              הכל ({listings.length})
            </button>
            {category.subcategories.map((s: string) => {
              const count = listings.filter((l) => l.subcategory === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSub(s)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${activeSub === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
          אין מודעות בקטגוריה זו עדיין.<br />
          <Link to="/marketplace/new" className="text-primary underline mt-2 inline-block">היה הראשון לפרסם!</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((l) => {
            const bumped = l.bump_expires_at && new Date(l.bump_expires_at) > new Date();
            const isBusiness = l.seller_type === "business" || businessSellers.has(l.seller_id);
            return (
              <Link key={l.id} to="/marketplace/$listingId" params={{ listingId: l.id }} className="group">
                <article className={`rounded-2xl border bg-card-elevated overflow-hidden transition hover:border-primary/50 hover:shadow-lg ${bumped ? "border-primary/60 ring-1 ring-primary/20" : "border-border/60"}`}>
                  <div className="relative aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden">
                    {l.images?.[0] ? (
                      <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">אין תמונה</div>
                    )}
                    {bumped && <Badge className="absolute top-2 right-2 gap-1 shadow-md"><ArrowUp className="h-3 w-3" />מוקפץ</Badge>}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-2 flex-1">{l.title}</h3>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Badge variant={isBusiness ? "default" : "secondary"} className="gap-1 text-[10px]">
                          {isBusiness ? <><Briefcase className="h-3 w-3" />עסקי</> : "פרטי"}
                        </Badge>
                        {trustedSellers.has(l.seller_id) && (
                          <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />נבחרת</Badge>
                        )}
                      </div>
                    </div>
                    {(l.brand || l.model) && (
                      <div className="text-xs text-muted-foreground">{[l.brand, l.model].filter(Boolean).join(" · ")}</div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-primary font-bold text-lg">₪{Number(l.price).toLocaleString()}</div>
                      {(l.city || l.region) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{l.city || l.region}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </ModulePlaceholder>
  );
}
