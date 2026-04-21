import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Tags, Search, Plus, MapPin, ShieldCheck, Briefcase, ArrowUp } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, BRANDS, CITIES, CONDITIONS } from "@/lib/marketplaceData";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "יד 2 — לוח כלי נגינה | המוזיקאי" },
      { name: "description", content: "כלי נגינה, ציוד הקלטה והגברה משומשים מקהילת המוזיקאים. קלידים, גיטרות, פסנתרים, תופים ועוד." },
    ],
  }),
  component: MarketplacePage,
});

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  brand: string | null;
  model: string | null;
  item_condition: string;
  price: number;
  region: string | null;
  city: string | null;
  images: string[];
  seller_type: string;
  bump_expires_at: string | null;
  created_at: string;
};

function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [trustedSellers, setTrustedSellers] = useState<Set<string>>(new Set());
  const [businessSellers, setBusinessSellers] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [subcategories, setSubcategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: list }, { data: trusted }, { data: business }] = await Promise.all([
        supabase
          .from("marketplace_listings")
          .select("id, seller_id, title, category, brand, model, item_condition, price, region, city, images, seller_type, bump_expires_at, created_at")
          .eq("status", "approved")
          .order("bump_expires_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_trusted_sellers").select("user_id"),
        supabase.from("marketplace_business_sellers").select("user_id").eq("subscription_status", "active"),
      ]);
      setListings((list ?? []) as Listing[]);
      setTrustedSellers(new Set((trusted ?? []).map((t: any) => t.user_id)));
      setBusinessSellers(new Set((business ?? []).map((b: any) => b.user_id)));
      setLoading(false);
    })();
  }, []);

  const availableSubs = useMemo(() => {
    if (categories.size === 0) return [] as string[];
    return Array.from(new Set(
      CATEGORIES.filter((c) => categories.has(c.value)).flatMap((c) => c.subs as readonly string[])
    ));
  }, [categories]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (search && !`${l.title} ${l.brand ?? ""} ${l.model ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (categories.size > 0 && !categories.has(l.category)) return false;
      if (brands.size > 0 && (!l.brand || !brands.has(l.brand))) return false;
      if (cities.size > 0 && (!l.city || !cities.has(l.city))) return false;
      if (conditions.size > 0 && !conditions.has(l.item_condition)) return false;
      if (minPrice && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price > Number(maxPrice)) return false;
      return true;
    });
  }, [listings, search, categories, brands, cities, conditions, minPrice, maxPrice]);

  const toggleSet = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const isBumped = (l: Listing) => l.bump_expires_at && new Date(l.bump_expires_at) > new Date();

  const FiltersContent = () => (
    <div className="space-y-5">
      <FilterGroup label="קטגוריה ראשית">
        <ScrollList>
          {CATEGORIES.map((c) => (
            <CheckboxRow key={c.value} checked={categories.has(c.value)} onChange={() => toggleSet(categories, c.value, setCategories)} label={c.label} />
          ))}
        </ScrollList>
      </FilterGroup>

      {availableSubs.length > 0 && (
        <FilterGroup label="תת-קטגוריה (סוג כלי)">
          <ScrollList>
            {availableSubs.map((s) => (
              <CheckboxRow key={s} checked={subcategories.has(s)} onChange={() => toggleSet(subcategories, s, setSubcategories)} label={s} />
            ))}
          </ScrollList>
        </FilterGroup>
      )}

      <FilterGroup label="יצרן">
        <ScrollList tall>
          {BRANDS.map((b) => (
            <CheckboxRow key={b} checked={brands.has(b)} onChange={() => toggleSet(brands, b, setBrands)} label={b} />
          ))}
        </ScrollList>
      </FilterGroup>

      <FilterGroup label="עיר">
        <ScrollList tall>
          {CITIES.map((c) => (
            <CheckboxRow key={c} checked={cities.has(c)} onChange={() => toggleSet(cities, c, setCities)} label={c} />
          ))}
        </ScrollList>
      </FilterGroup>

      <FilterGroup label="מצב המוצר">
        <div className="space-y-2">
          {CONDITIONS.map((c) => (
            <CheckboxRow key={c.value} checked={conditions.has(c.value)} onChange={() => toggleSet(conditions, c.value, setConditions)} label={c.label} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="טווח מחירים (₪)">
        <div className="flex gap-2">
          <Input type="number" placeholder="מינ׳" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
          <Input type="number" placeholder="מקס׳" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
        </div>
      </FilterGroup>

      <Button variant="outline" className="w-full" onClick={() => {
        setCategories(new Set()); setSubcategories(new Set()); setBrands(new Set());
        setCities(new Set()); setConditions(new Set()); setMinPrice(""); setMaxPrice(""); setSearch("");
      }}>נקה סינונים</Button>
    </div>
  );

  return (
    <ModulePlaceholder icon={Tags} title="לוח יד 2" subtitle="קונים, מוכרים ומחליפים — בתוך הקהילה.">
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי שם, מותג או דגם..." className="pr-10" />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">סינון</Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto w-[320px] sm:w-[380px]">
            <SheetHeader><SheetTitle>סינון מודעות</SheetTitle></SheetHeader>
            <div className="mt-6"><FiltersContent /></div>
          </SheetContent>
        </Sheet>
        <Link to="/marketplace/new">
          <Button className="w-full sm:w-auto"><Plus className="h-4 w-4" />פרסם מודעה</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-border/60 bg-card p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <FiltersContent />
          </div>
        </aside>

        <div>
          <div className="mb-4 text-sm text-muted-foreground">{filtered.length} מודעות</div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
              לא נמצאו מודעות התואמות לסינון. <br />
              <Link to="/marketplace/new" className="text-primary underline mt-2 inline-block">היה הראשון לפרסם!</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => {
                const bumped = isBumped(l);
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
                        {bumped && (
                          <Badge className="absolute top-2 right-2 gap-1 shadow-md"><ArrowUp className="h-3 w-3" />מוקפץ</Badge>
                        )}
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
        </div>
      </div>
    </ModulePlaceholder>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ScrollList({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div className={`space-y-1.5 overflow-y-auto pr-1 ${tall ? "max-h-56" : "max-h-44"}`}>
      {children}
    </div>
  );
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm hover:text-primary transition">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
