import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Tags, Search, Plus, MapPin, ShieldCheck, Briefcase, ArrowUp, ArrowRight, ChevronDown, Flame, BadgeCheck, X, LayoutGrid, List as ListIcon, ArrowUpDown, Check } from "lucide-react";
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
import { MarketplaceListingCard } from "@/components/marketplace/MarketplaceListingCard";

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
  const [sortBy, setSortBy] = useState<"best" | "newest" | "oldest" | "price_asc" | "price_desc">("best");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    (async () => {
      const [{ data: list }, { data: trusted }, { data: business }, { data: cats }] = await Promise.all([
        supabase
          .from("marketplace_listings")
          .select("id, seller_id, title, category, subcategory, brand, model, item_condition, price, region, city, images, seller_type, bump_expires_at, created_at, is_urgent, audio_url, is_sold")
          .eq("status", "approved")
          .order("is_urgent", { ascending: false })
          .order("bump_expires_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_trusted_sellers").select("user_id"),
        supabase.from("marketplace_business_sellers").select("user_id"),
        supabase.from("marketplace_categories").select("slug, label, image_url, subcategories, display_order").eq("is_active", true).order("display_order"),
      ]);
      setListings((list ?? []) as Listing[]);
      setTrustedSellers(new Set((trusted ?? []).map((t: any) => t.user_id)));
      // Unified tier: a "business" seller badge requires a business_sellers row AND a VIP global tier.
      const { fetchVipUserIds } = await import("@/lib/tiers");
      const businessUserIds = (business ?? []).map((b: any) => b.user_id);
      const vipSet = await fetchVipUserIds(businessUserIds);
      setBusinessSellers(new Set(businessUserIds.filter((uid: string) => vipSet.has(uid))));
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
    const result = listings.filter((l) => {
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
    const sorted = [...result];
    switch (sortBy) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        break;
      case "price_asc":
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "best":
      default:
        // urgent first, then bumped, then newest (already from query)
        sorted.sort((a, b) => {
          const ua = a.is_urgent ? 1 : 0;
          const ub = b.is_urgent ? 1 : 0;
          if (ub !== ua) return ub - ua;
          const ba = a.bump_expires_at && new Date(a.bump_expires_at) > new Date() ? 1 : 0;
          const bb = b.bump_expires_at && new Date(b.bump_expires_at) > new Date() ? 1 : 0;
          if (bb !== ba) return bb - ba;
          return +new Date(b.created_at) - +new Date(a.created_at);
        });
    }
    return sorted;
  }, [listings, search, categories, subcategories, brands, cities, conditions, minPrice, maxPrice, urgentOnly, sellerTypeFilter, businessSellers, sortBy]);

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

      {/* Modern filter chips bar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <FilterChip
          label="קטגוריה"
          count={categories.size}
          options={categoriesList.map((c) => ({ value: c.slug, label: c.label, count: listings.filter((l) => l.category === c.slug).length }))}
          selected={categories}
          onToggle={(v) => toggleSet(categories, v, setCategories)}
          onClear={() => { setCategories(new Set()); setSubcategories(new Set()); setExpandedCat(null); }}
        />
        {availableSubs.length > 0 && (
          <FilterChip
            label="תת-קטגוריה"
            count={subcategories.size}
            options={availableSubs.map((s) => ({ value: s, label: s, count: listings.filter((l) => l.subcategory === s).length }))}
            selected={subcategories}
            onToggle={(v) => toggleSet(subcategories, v, setSubcategories)}
            onClear={() => setSubcategories(new Set())}
          />
        )}
        <FilterChip
          label="מצב המוצר"
          count={conditions.size}
          options={CONDITIONS.map((c) => ({ value: c.value, label: c.label, count: listings.filter((l) => l.item_condition === c.value).length }))}
          selected={conditions}
          onToggle={(v) => toggleSet(conditions, v, setConditions)}
          onClear={() => setConditions(new Set())}
        />
        <FilterChip
          label="יצרן"
          count={brands.size}
          options={BRANDS.map((b) => ({ value: b, label: b, count: listings.filter((l) => l.brand === b).length }))}
          selected={brands}
          onToggle={(v) => toggleSet(brands, v, setBrands)}
          onClear={() => setBrands(new Set())}
        />
        <FilterChip
          label="עיר מכירה"
          count={cities.size}
          options={CITIES.map((c) => ({ value: c, label: c, count: listings.filter((l) => l.city === c).length }))}
          selected={cities}
          onToggle={(v) => toggleSet(cities, v, setCities)}
          onClear={() => setCities(new Set())}
        />
        <PriceChip minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} />
        <button
          type="button"
          onClick={() => setUrgentOnly((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm transition ${urgentOnly ? "bg-rose-500 text-white border-rose-500" : "bg-background border-border hover:border-rose-400"}`}
        >
          <Flame className="h-3.5 w-3.5" />מכירה דחופה
        </button>
        <SellerTypeChip value={sellerTypeFilter} onChange={setSellerTypeFilter} />
        {(categories.size + subcategories.size + brands.size + cities.size + conditions.size > 0 || minPrice || maxPrice || urgentOnly || sellerTypeFilter !== "all" || search) && (
          <button
            type="button"
            onClick={() => {
              setCategories(new Set()); setSubcategories(new Set()); setBrands(new Set());
              setCities(new Set()); setConditions(new Set()); setMinPrice(""); setMaxPrice("");
              setUrgentOnly(false); setSellerTypeFilter("all"); setSearch(""); setSearchInput(""); setExpandedCat(null);
            }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3 w-3" />נקה הכל
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); applySearch(); }} className="flex flex-1 gap-3">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="חפש לפי שם, מותג או דגם... (Enter לחיפוש)"
              className="pe-10"
            />
          </div>
          <Button type="submit" variant="secondary" className="hidden sm:inline-flex">חפש</Button>
        </form>
        <SaveSearchDialog
          filters={{
            search, categories: Array.from(categories), subcategories: Array.from(subcategories),
            brands: Array.from(brands), cities: Array.from(cities), conditions: Array.from(conditions),
            minPrice, maxPrice, urgentOnly, sellerTypeFilter,
          }}
        />
        <Button asChild className="w-full sm:w-auto">
          <Link to="/marketplace/new"><Plus className="h-4 w-4" />פרסם מודעה</Link>
        </Button>
      </div>

      {/* Results header: count + sort + view toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{filtered.length} מודעות</div>
        <div className="flex items-center gap-2">
          <SortChip value={sortBy} onChange={setSortBy} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
            לא נמצאו מודעות התואמות לסינון. <br />
            <Link to="/marketplace/new" className="text-primary underline mt-2 inline-block">היה הראשון לפרסם!</Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((l) => {
              const isBusiness = l.seller_type === "business" || businessSellers.has(l.seller_id);
              return (
                <MarketplaceListingCard
                  key={l.id}
                  listing={l}
                  variant="grid"
                  isBusiness={isBusiness}
                  isTrusted={trustedSellers.has(l.seller_id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((l) => {
              const isBusiness = l.seller_type === "business" || businessSellers.has(l.seller_id);
              return (
                <MarketplaceListingCard
                  key={l.id}
                  listing={l}
                  variant="list"
                  isBusiness={isBusiness}
                  isTrusted={trustedSellers.has(l.seller_id)}
                />
              );
            })}
          </div>
        )}
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
    <div className={`space-y-1.5 overflow-y-auto pe-1 ${tall ? "max-h-56" : "max-h-44"}`}>
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

type ChipOption = { value: string; label: string; count?: number };

function FilterChip({ label, count, options, selected, onToggle, onClear }: {
  label: string; count: number; options: ChipOption[]; selected: Set<string>;
  onToggle: (v: string) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${count > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}>
          <span>{label}{count > 0 ? ` (${count})` : ""}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="max-h-80 overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">אין אפשרויות זמינות</div>
          ) : options.map((o) => (
            <button key={o.value} type="button" onClick={() => onToggle(o.value)}
              className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition ${selected.has(o.value) ? "bg-primary/10 text-primary font-medium" : ""}`}>
              <span className="flex items-center gap-2">
                <Checkbox checked={selected.has(o.value)} className="pointer-events-none" />
                {o.label}
              </span>
              {o.count !== undefined && <span className="text-xs text-muted-foreground">({o.count})</span>}
            </button>
          ))}
        </div>
        {count > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { onClear(); setOpen(false); }}>
              <X className="h-3 w-3" />נקה
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PriceChip({ minPrice, maxPrice, setMinPrice, setMaxPrice }: {
  minPrice: string; maxPrice: string; setMinPrice: (v: string) => void; setMaxPrice: (v: string) => void;
}) {
  const active = !!(minPrice || maxPrice);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}>
          <span>מחיר{active ? ` ${minPrice || "0"}–${maxPrice || "∞"}` : ""}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <Label className="text-xs">טווח מחירים (₪)</Label>
          <div className="flex gap-2">
            <Input type="number" placeholder="מינ׳" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <Input type="number" placeholder="מקס׳" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          {active && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>נקה</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SellerTypeChip({ value, onChange }: { value: "all" | "private" | "business"; onChange: (v: "all" | "private" | "business") => void }) {
  const active = value !== "all";
  const label = value === "private" ? "פרטי" : value === "business" ? "עסקי" : "סוג מוכר";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"}`}>
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="end">
        {[{ v: "all" as const, label: "הכל" }, { v: "private" as const, label: "פרטי" }, { v: "business" as const, label: "עסקי" }].map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`w-full text-end rounded-md px-3 py-2 text-sm hover:bg-muted transition ${value === o.v ? "bg-primary/10 text-primary font-medium" : ""}`}>
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const SORT_OPTIONS: { v: "best" | "newest" | "oldest" | "price_asc" | "price_desc"; label: string }[] = [
  { v: "best", label: "ההתאמה הטובה ביותר" },
  { v: "newest", label: "זמן: רשום לאחרונה" },
  { v: "oldest", label: "זמן: מוקדמים בקרוב" },
  { v: "price_asc", label: "מחיר: הנמוך ביותר ראשון" },
  { v: "price_desc", label: "מחיר: הגבוה ביותר ראשון" },
];

function SortChip({ value, onChange }: {
  value: "best" | "newest" | "oldest" | "price_asc" | "price_desc";
  onChange: (v: "best" | "newest" | "oldest" | "price_asc" | "price_desc") => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.v === value) ?? SORT_OPTIONS[0];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm transition hover:border-primary/40"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>מיין: {current.label}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => { onChange(o.v); setOpen(false); }}
            className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted transition ${value === o.v ? "text-primary font-medium" : ""}`}
          >
            <span>{o.label}</span>
            {value === o.v && <Check className="h-4 w-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ViewToggle({ value, onChange }: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-sm transition hover:border-primary/40"
          aria-label="שנה תצוגה"
        >
          {value === "grid" ? <LayoutGrid className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="end">
        <button
          type="button"
          onClick={() => { onChange("grid"); setOpen(false); }}
          className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition ${value === "grid" ? "text-primary font-medium" : ""}`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>תצוגת קוביות</span>
          {value === "grid" && <Check className="h-4 w-4 me-auto" />}
        </button>
        <button
          type="button"
          onClick={() => { onChange("list"); setOpen(false); }}
          className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition ${value === "list" ? "text-primary font-medium" : ""}`}
        >
          <ListIcon className="h-4 w-4" />
          <span>תצוגת רשימה</span>
          {value === "list" && <Check className="h-4 w-4 me-auto" />}
        </button>
      </PopoverContent>
    </Popover>
  );
}
