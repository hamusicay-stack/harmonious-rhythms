import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, SlidersHorizontal, Tag } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatILS, STATUS_TAG_OPTIONS } from "@/lib/shopUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { LikeButton } from "@/components/LikeButton";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "חנות — המוזיקאי" },
      { name: "description", content: "מקצבים, סאמפלים, פלאגינים וציוד מקצועי. חיפוש חכם, סינון לפי יצרן ומחיר, תמיכה מלאה בעברית." },
      { property: "og:title", content: "חנות — המוזיקאי" },
      { property: "og:description", content: "מקצבים, סאמפלים, פלאגינים וציוד מקצועי בחנות אחת." },
    ],
  }),
  component: ShopHomePage,
});

type Product = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  product_type: string;
  brand: string | null;
  price: number;
  sale_price: number | null;
  main_image: string | null;
  status_tags: string[];
  category_id: string | null;
  stock_quantity: number;
  manage_stock: boolean;
};

type Category = {
  id: string;
  slug: string;
  label: string;
  image_url: string | null;
};

function ShopHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase
          .from("shop_products")
          .select("id,title,slug,short_description,product_type,brand,price,sale_price,main_image,status_tags,category_id,stock_quantity,manage_stock")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("shop_categories")
          .select("id,slug,label,image_url")
          .eq("is_active", true)
          .order("display_order"),
      ]);
      setProducts((prods as Product[]) ?? []);
      setCategories((cats as Category[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.brand && set.add(p.brand));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.brand?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (brandFilter !== "all" && p.brand !== brandFilter) return false;
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
    return list;
  }, [products, search, categoryFilter, brandFilter, sortBy]);

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">חנות הציוד</h1>
              <p className="text-sm text-muted-foreground">פלאגינים, סאמפלים וציוד שמוזיקאים בוחרים למוזיקאים</p>
            </div>
          </div>
        </div>

        {/* Category cards grid */}
        {categories.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((c) => {
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(active ? "all" : c.id)}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card/50 p-4 text-right transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-elegant ${active ? "border-primary shadow-elegant ring-1 ring-primary/40" : "border-border/60"}`}
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity group-hover:opacity-50" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  )}
                  <div className="relative flex h-full flex-col justify-between">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-base font-bold">{c.label}</div>
                      {active && <div className="text-[10px] uppercase tracking-wider text-primary">מסונן</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Categories chip strip (kept for quick reset) */}
        {categories.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${categoryFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}
            >
              כל הקטגוריות
            </button>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש מוצר, מותג..."
                className="pr-10"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger><SelectValue placeholder="יצרן" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל היצרנים</SelectItem>
                {brands.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">החדשים ביותר</SelectItem>
                <SelectItem value="price_asc">מחיר: מהזול ליקר</SelectItem>
                <SelectItem value="price_desc">מחיר: מהיקר לזול</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Products grid */}
        {loading ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold">אין מוצרים להצגה</p>
            <p className="text-sm text-muted-foreground">נסה לשנות את הסינון או חזור מאוחר יותר</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasSale = product.sale_price && product.sale_price < product.price;
  const finalPrice = hasSale ? product.sale_price! : product.price;
  const outOfStock = product.manage_stock && product.stock_quantity <= 0;

  return (
    <Link
      to="/shop/$slug"
      params={{ slug: product.slug }}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
        {product.main_image ? (
          <img src={product.main_image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center"><ShoppingBag className="h-12 w-12 text-muted-foreground/40" /></div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          {(product.status_tags ?? []).map((tag) => {
            const def = STATUS_TAG_OPTIONS.find((t) => t.value === tag);
            if (!def) return null;
            return <Badge key={tag} className={`${def.color} text-white border-0`}>{def.label}</Badge>;
          })}
          {hasSale && <Badge className="bg-red-600 text-white border-0">מבצע</Badge>}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold">אזל מהמלאי</div>
        )}
        <div className="absolute bottom-2 left-2 z-10" onClick={(e) => e.preventDefault()}>
          <LikeButton itemType="shop_product" itemId={product.id} className="bg-background/80 backdrop-blur hover:bg-background h-8 w-8" />
        </div>
      </div>
      <div className="p-4">
        {product.brand && <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>}
        <h3 className="mb-2 line-clamp-2 font-semibold leading-tight">{product.title}</h3>
        {product.short_description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{product.short_description}</p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">{formatILS(finalPrice)}</span>
          {hasSale && <span className="text-sm text-muted-foreground line-through">{formatILS(product.price)}</span>}
        </div>
      </div>
    </Link>
  );
}
