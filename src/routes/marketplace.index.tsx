import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Tags, Search, Plus, MapPin, ShieldCheck, Briefcase, ArrowUp, ArrowRight, ChevronDown, Flame, BadgeCheck, X } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES as FALLBACK_CATEGORIES, BRANDS, CITIES, CONDITIONS } from "@/lib/marketplaceData";
import { SaveSearchDialog } from "@/components/marketplace/SaveSearchDialog";

export const Route = createFileRoute("/marketplace/")({
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
  subcategory: string | null;
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
  is_urgent?: boolean;
  audio_url?: string | null;
};

type CategoryRow = {
  slug: string;
  label: string;
  image_url: string | null;
  subcategories: string[];
  display_order: number;
};

function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [trustedSellers, setTrustedSellers] = useState<Set<string>>(new Set());
  const [businessSellers, setBusinessSellers] = useState<Set<string>>(new Set());
  const [categoriesData, setCategoriesData] = useState<CategoryRow[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [subcategories, setSubcategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sellerTypeFilter, setSellerTypeFilter] = useState<"all" | "private" | "business">("all");

  useEffect(() => {
    (async () => {
      const [{ data: list }, { data: trusted }, { data: business }, { data: cats }] = await Promise.all([
        supabase
          .from("marketplace_listings")
          .select("id, seller_id, title, category, subcategory, brand, model, item_condition, price, region, city, images, seller_type, bump_expires_at, created_at, is_urgent, audio_url")
          .eq("status", "approved")
          .order("is_urgent", { ascending: false })
          .order("bump_expires_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_trusted_sellers").select("user_id"),
        supabase.from("marketplace_business_sellers").select("user_id").eq("subscription_status", "active"),
        supabase.from("marketplace_categories").select("slug, label, image_url, subcategories, display_order").eq("is_active", true).order("display_order"),
      ]);
      setListings((list ?? []) as Listing[]);
      setTrustedSellers(new Set((trusted ?? []).map((t: any) => t.user_id)));
      setBusinessSellers(new Set((business ?? []).map((b: any) => b.user_id)));
      setCategoriesData((cats ?? []) as CategoryRow[]);
      setLoading(false);
    })();
  }, []);

  const categoriesList = categoriesData.length > 0
    ? categoriesData
    : FALLBACK_CATEGORIES.map((c, i) => ({ slug: c.value, label: c.label, image_url: null, subcategories: [...c.subs], display_order: i }));

  const availableSubs = useMemo(() => {
    if (categories.size === 0) return [] as string[];
    return Array.from(new Set(
      categoriesList.filter((c) => categories.has(c.slug)).flatMap((c) => c.subcategories)
    ));
  }, [categories, categoriesList]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (search && !`${l.title} ${l.brand ?? ""} ${l.model ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (categories.size > 0 && !categories.has(l.category)) return false;
      if (subcategories.size > 0 && (!l.subcategory || !subcategories.has(l.subcategory))) return false;
      if (brands.size > 0 && (!l.brand || !brands.has(l.brand))) return false;
      if (cities.size > 0 && (!l.city || !cities.has(l.city))) return false;
      if (conditions.size > 0 && !conditions.has(l.item_condition)) return false;
      if (minPrice && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price > Number(maxPrice)) return false;
      if (urgentOnly && !l.is_urgent) return false;
      if (sellerTypeFilter === "private" && (l.seller_type === "business" || businessSellers.has(l.seller_id))) return false;
      if (sellerTypeFilter === "business" && !(l.seller_type === "business" || businessSellers.has(l.seller_id))) return false;
      return true;
    });
  }, [listings, search, categories, subcategories, brands, cities, conditions, minPrice, maxPrice, urgentOnly, sellerTypeFilter, businessSellers]);

  const toggleSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  }, []);

  const isBumped = (l: Listing) => l.bump_expires_at && new Date(l.bump_expires_at) > new Date();

  const filtersNode = (
    <FiltersPanel
      categoriesList={categoriesList}
      categories={categories}
      setCategories={setCategories}
      subcategories={subcategories}
      setSubcategories={setSubcategories}
      availableSubs={availableSubs}
      brands={brands}
      setBrands={setBrands}
      cities={cities}
      setCities={setCities}
      conditions={conditions}
      setConditions={setConditions}
      minPrice={minPrice}
      setMinPrice={setMinPrice}
      maxPrice={maxPrice}
      setMaxPrice={setMaxPrice}
      onClear={() => {
        setCategories(new Set()); setSubcategories(new Set()); setBrands(new Set());
        setCities(new Set()); setConditions(new Set()); setMinPrice(""); setMaxPrice(""); setSearch("");
      }}
      toggleSet={toggleSet}
    />
  );

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const applySearch = () => setSearch(searchInput);

  const expandedCategory = expandedCat ? categoriesList.find((c) => c.slug === expandedCat) : null;
  const visibleCategories = expandedCategory ? [expandedCategory] : categoriesList;

  return (
    <ModulePlaceholder icon={Tags} title="לוח יד 2" subtitle="קונים, מוכרים ומחליפים — בתוך הקהילה.">
      {/* Category Banner */}
      {categoriesList.length > 0 && (
        <div className="mb-6">
          <div className="-mx-2 px-2 overflow-x-auto">
            <div className="flex gap-4 pb-2 min-w-max items-start">
              {visibleCategories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    if (expandedCat === c.slug) {
                      setExpandedCat(null);
                      setCategories(new Set());
                      setSubcategories(new Set());
                    } else {
                      setExpandedCat(c.slug);
                      setCategories(new Set([c.slug]));
                      setSubcategories(new Set());
                    }
                  }}
                  className="flex flex-col items-center gap-2 group shrink-0 w-20 sm:w-24"
                >
                  <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 transition flex items-center justify-center bg-muted ${expandedCat === c.slug ? "border-primary ring-2 ring-primary/30" : "border-border group-hover:border-primary"}`}>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.label} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Tags className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <span className={`text-xs text-center font-medium line-clamp-2 transition ${expandedCat === c.slug ? "text-primary" : "group-hover:text-primary"}`}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {expandedCategory && expandedCategory.subcategories.length > 0 && (
            <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">תתי-קטגוריות של {expandedCategory.label}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setExpandedCat(null); setCategories(new Set()); setSubcategories(new Set()); }}
                  className="gap-1"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  חזרה לכל הקטגוריות
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubcategories(new Set())}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${subcategories.size === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}
                >
                  הכל
                </button>
                {expandedCategory.subcategories.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubcategories(new Set([s]))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${subcategories.has(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); applySearch(); }} className="flex flex-1 gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="חפש לפי שם, מותג או דגם... (Enter לחיפוש)"
              className="pr-10"
            />
          </div>
          <Button type="submit" variant="secondary" className="hidden sm:inline-flex">חפש</Button>
        </form>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="lg:hidden">סינון</Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto w-[320px] sm:w-[380px]">
            <SheetHeader><SheetTitle>סינון מודעות</SheetTitle></SheetHeader>
            <div className="mt-6">{filtersNode}</div>
          </SheetContent>
        </Sheet>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/marketplace/new"><Plus className="h-4 w-4" />פרסם מודעה</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-border/60 bg-card p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            {filtersNode}
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

type FiltersPanelProps = {
  categoriesList: CategoryRow[];
  categories: Set<string>;
  setCategories: (s: Set<string>) => void;
  subcategories: Set<string>;
  setSubcategories: (s: Set<string>) => void;
  availableSubs: string[];
  brands: Set<string>;
  setBrands: (s: Set<string>) => void;
  cities: Set<string>;
  setCities: (s: Set<string>) => void;
  conditions: Set<string>;
  setConditions: (s: Set<string>) => void;
  minPrice: string;
  setMinPrice: (s: string) => void;
  maxPrice: string;
  setMaxPrice: (s: string) => void;
  onClear: () => void;
  toggleSet: (set: Set<string>, value: string, setter: (s: Set<string>) => void) => void;
};

function FiltersPanel(props: FiltersPanelProps) {
  const {
    categoriesList, categories, setCategories, subcategories, setSubcategories, availableSubs,
    brands, setBrands, cities, setCities, conditions, setConditions,
    minPrice, setMinPrice, maxPrice, setMaxPrice, onClear, toggleSet,
  } = props;

  return (
    <div className="space-y-5">
      <FilterGroup label="קטגוריה ראשית">
        <ScrollList>
          {categoriesList.map((c) => (
            <CheckboxRow key={c.slug} checked={categories.has(c.slug)} onChange={() => toggleSet(categories, c.slug, setCategories)} label={c.label} />
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
          <Input type="number" inputMode="numeric" placeholder="מינ׳" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
          <Input type="number" inputMode="numeric" placeholder="מקס׳" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
        </div>
      </FilterGroup>

      <Button variant="outline" className="w-full" onClick={onClear}>נקה סינונים</Button>
    </div>
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
