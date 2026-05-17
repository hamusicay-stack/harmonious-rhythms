import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatILS } from "@/lib/shopUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  slug: string;
  title: string;
  price: number;
  sale_price: number | null;
  main_image: string | null;
  product_type: string;
};

type Props = {
  category?: string | null;
  currentItemId?: string;
  variant?: "carousel" | "compact";
  className?: string;
};

export function CrossSellRecommendations({ category, currentItemId, variant = "carousel", className }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Try to match by category slug in shop_categories
      let matched: Product[] = [];
      if (category) {
        const { data: cats } = await supabase
          .from("shop_categories")
          .select("id, slug, name")
          .or(`slug.ilike.%${category}%,name.ilike.%${category}%`)
          .limit(5);
        const catIds = (cats ?? []).map((c: any) => c.id);
        if (catIds.length) {
          const { data } = await supabase
            .from("shop_products")
            .select("id, slug, title, price, sale_price, main_image, product_type")
            .eq("status", "active")
            .in("category_id", catIds)
            .order("views_count", { ascending: false })
            .limit(8);
          matched = (data ?? []) as Product[];
        }
      }
      // Fallback: trending active products
      if (matched.length === 0) {
        const { data } = await supabase
          .from("shop_products")
          .select("id, slug, title, price, sale_price, main_image, product_type")
          .eq("status", "active")
          .order("views_count", { ascending: false })
          .limit(8);
        matched = (data ?? []) as Product[];
      }
      if (!cancelled) {
        setItems(matched.filter((p) => p.id !== currentItemId));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category, currentItemId]);

  const handleAdd = (p: Product) => {
    const price = Number(p.sale_price ?? p.price);
    add({ id: p.id, slug: p.slug, title: p.title, price, image: p.main_image, product_type: p.product_type });
    toast.success("נוסף לעגלה", { description: p.title });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-6 text-muted-foreground ${className ?? ""}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (items.length === 0) return null;

  const isCompact = variant === "compact";

  return (
    <section className={className}>
      <header className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold tracking-tight">
          מומלץ להוסיף לקנייה שלך
        </h3>
        <span className="text-xs text-muted-foreground">· נרכשים יחד לעיתים קרובות</span>
      </header>
      <ul
        className={
          isCompact
            ? "flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
            : "flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] snap-x snap-mandatory"
        }
      >
        {items.map((p) => {
          const price = Number(p.sale_price ?? p.price);
          return (
            <li
              key={p.id}
              className={
                isCompact
                  ? "snap-start shrink-0 w-40 rounded-lg border bg-card p-2"
                  : "snap-start shrink-0 w-44 rounded-xl border border-border/60 bg-card p-2.5 transition hover:border-primary/60 hover:shadow-md"
              }
            >
              <Link to="/shop/$slug" params={{ slug: p.slug }} className="block">
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {p.main_image ? (
                    <img src={p.main_image} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40 text-xs">אין תמונה</div>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-tight">{p.title}</div>
                <div className="mt-1 text-sm font-bold text-primary">{formatILS(price)}</div>
              </Link>
              <Button
                type="button"
                size="sm"
                onClick={() => handleAdd(p)}
                className="mt-2 h-8 w-full gap-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> הוסף לעגלה
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
