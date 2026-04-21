import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Tags, Search, Plus, MapPin, ShieldCheck, Star } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "יד שנייה — המוזיקאי" },
      { name: "description", content: "כלי נגינה וציוד הקלטה משומשים מקהילת המוזיקאים." },
    ],
  }),
  component: MarketplacePage,
});

const CATEGORIES = [
  { value: "keyboards", label: "אורגנים ומקלדות" },
  { value: "amplification", label: "ציוד הגברה" },
  { value: "wind", label: "כלי נשיפה" },
  { value: "studio", label: "אולפן ביתי" },
];

const BRANDS = ["Korg", "Yamaha", "Roland", "Casio", "Nord", "Kurzweil", "Behringer", "Shure", "Other"];

const CONDITIONS = [
  { value: "new_sealed", label: "חדש באריזה" },
  { value: "like_new", label: "משומש כחדש" },
  { value: "used_good", label: "תקין" },
  { value: "for_parts", label: "לחלקים" },
];

const REGIONS = ["צפון", "חיפה והקריות", "שרון", "מרכז", "תל אביב", "ירושלים", "שפלה", "דרום", "אילת"];

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
  images: string[];
};

function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [trustedSellers, setTrustedSellers] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);

  useEffect(() => {
    (async () => {
      const [{ data: list }, { data: trusted }] = await Promise.all([
        supabase
          .from("marketplace_listings")
          .select("id, seller_id, title, category, brand, model, item_condition, price, region, images")
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_trusted_sellers").select("user_id"),
      ]);
      setListings((list ?? []) as Listing[]);
      setTrustedSellers(new Set((trusted ?? []).map((t: any) => t.user_id)));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (search && !`${l.title} ${l.brand ?? ""} ${l.model ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && l.category !== category) return false;
      if (brands.size > 0 && (!l.brand || !brands.has(l.brand))) return false;
      if (conditions.size > 0 && !conditions.has(l.item_condition)) return false;
      if (region !== "all" && l.region !== region) return false;
      if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
      return true;
    });
  }, [listings, search, category, brands, conditions, region, priceRange]);

  const toggleSet = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>קטגוריה</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>מותג</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {BRANDS.map(b => (
            <label key={b} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={brands.has(b)} onCheckedChange={() => toggleSet(brands, b, setBrands)} />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>מצב הכלי</Label>
        <div className="space-y-2">
          {CONDITIONS.map(c => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={conditions.has(c.value)} onCheckedChange={() => toggleSet(conditions, c.value, setConditions)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>אזור</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הארץ</SelectItem>
            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>טווח מחירים: ₪{priceRange[0].toLocaleString()} - ₪{priceRange[1].toLocaleString()}</Label>
        <Slider min={0} max={50000} step={500} value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} />
      </div>

      <Button variant="outline" className="w-full" onClick={() => {
        setBrands(new Set()); setConditions(new Set()); setCategory("all"); setRegion("all"); setPriceRange([0, 50000]); setSearch("");
      }}>נקה סינונים</Button>
    </div>
  );

  return (
    <ModulePlaceholder icon={Tags} title="לוח יד שנייה" subtitle="קונים, מוכרים ומחליפים — בתוך הקהילה.">
      {/* Top bar: search + post + mobile filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי שם, מותג או דגם..." className="pr-10" />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">סינון</Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader><SheetTitle>סינון מודעות</SheetTitle></SheetHeader>
            <div className="mt-6"><FiltersContent /></div>
          </SheetContent>
        </Sheet>
        <Link to="/marketplace/new">
          <Button className="w-full sm:w-auto"><Plus className="h-4 w-4" />פרסם מודעה</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-border/60 bg-card p-5 sticky top-24">
            <FiltersContent />
          </div>
        </aside>

        {/* Listings grid */}
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
              {filtered.map((l) => (
                <Link key={l.id} to="/marketplace/$listingId" params={{ listingId: l.id }} className="group">
                  <article className="rounded-2xl border border-border/60 bg-card-elevated overflow-hidden transition hover:border-primary/50 hover:shadow-lg">
                    <div className="aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden">
                      {l.images?.[0] ? (
                        <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">אין תמונה</div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-2 flex-1">{l.title}</h3>
                        {trustedSellers.has(l.seller_id) && (
                          <Badge variant="secondary" className="shrink-0 gap-1"><ShieldCheck className="h-3 w-3" />נבחרת</Badge>
                        )}
                      </div>
                      {(l.brand || l.model) && (
                        <div className="text-xs text-muted-foreground">{[l.brand, l.model].filter(Boolean).join(" · ")}</div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-primary font-bold text-lg">₪{Number(l.price).toLocaleString()}</div>
                        {l.region && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{l.region}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModulePlaceholder>
  );
}
