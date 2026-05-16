import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, ArrowRight, ShieldCheck, Truck, Package, Piano } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatILS, STATUS_TAG_OPTIONS, PRODUCT_TYPE_LABEL } from "@/lib/shopUtils";
import { sanitizeHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { VirtualOrganPreview } from "@/components/shop/VirtualOrganPreview";
import { CpiDropzone, type CpiFileInfo } from "@/components/shop/CpiDropzone";
import { useKeyboardSelection, type SelectedModel } from "@/contexts/KeyboardSelectionContext";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("shop_products")
      .select("title, short_description, meta_title, meta_description, main_image, price, slug")
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    return { meta: data };
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const title = (m?.meta_title || m?.title || "מוצר") + " — המוזיקאי";
    const description = m?.meta_description || m?.short_description || "פרטי מוצר בחנות המוזיקאי.";
    const url = `https://harmonious-rhythms.lovable.app/shop/${params.slug}`;
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
    ];
    if (m?.main_image) {
      meta.push({ property: "og:image", content: m.main_image });
      meta.push({ name: "twitter:image", content: m.main_image });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  component: ProductPage,
});

type Product = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: string;
  brand: string | null;
  model: string | null;
  price: number;
  sale_price: number | null;
  main_image: string | null;
  status_tags: string[];
  warranty_terms: string | null;
  audio_demo_url: string | null;
  video_demo_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  stock_quantity: number;
  manage_stock: boolean;
  custom_fields: Record<string, any>;
};

type ProductImage = { id: string; image_url: string; alt_text: string | null };

function ProductPage() {
  const { slug } = useParams({ from: "/shop/$slug" });
  const { profile } = useAuth();
  const { selectedModel, setSelectedModel } = useKeyboardSelection();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [linkedRhythmSet, setLinkedRhythmSet] = useState<{ id: string; requires_info_file: boolean; info_file_extension: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cpiFile, setCpiFile] = useState<CpiFileInfo | null>(null);
  const [keyboardModels, setKeyboardModels] = useState<{ id: string; brand_id: string; model_name: string; ui_image_url: string | null; brand?: { id: string; name: string; logo_url: string | null } | null }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("shop_products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (p) {
        setProduct(p as any);
        setActiveImg(p.main_image);
        const rhythmSetId = (p.custom_fields as any)?.rhythm_set_id as string | undefined;
        const [{ data: imgs }, catRes, rsRes] = await Promise.all([
          supabase
            .from("shop_product_images")
            .select("id,image_url,alt_text")
            .eq("product_id", p.id)
            .order("display_order"),
          p.category_id
            ? supabase.from("shop_categories").select("slug").eq("id", p.category_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          rhythmSetId
            ? supabase.from("rhythm_sets" as any).select("id, requires_info_file, info_file_extension").eq("id", rhythmSetId).maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);
        setImages((imgs as ProductImage[]) ?? []);
        setCategorySlug((catRes?.data as any)?.slug ?? null);
        setLinkedRhythmSet((rsRes?.data as any) ?? null);
      }
      setLoading(false);
    })();
  }, [slug]);

  // Fetch keyboard models for the selector
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("keyboard_models" as any)
        .select("*, brand:brands(*)")
        .order("model_name");
      setKeyboardModels((data as any) ?? []);
    })();
  }, []);

  // Resolve the active keyboard model id: context → profile fallback → none
  const activeModelId = useMemo<string | null>(() => {
    if (selectedModel?.id) return selectedModel.id;
    const fromProfile = (profile as any)?.keyboard_model_id as string | null | undefined;
    if (fromProfile) return fromProfile;
    return null;
  }, [selectedModel, profile]);

  const onPickModel = (id: string) => {
    const m = keyboardModels.find((k) => k.id === id);
    if (!m) return;
    const sel: SelectedModel = {
      id: m.id,
      brand_id: m.brand_id,
      model_name: m.model_name,
      ui_image_url: m.ui_image_url,
      brand: m.brand ?? null,
    };
    setSelectedModel(sel);
  };

  const allImages = product?.main_image
    ? [{ id: "main", image_url: product.main_image, alt_text: product.title }, ...images]
    : images;

  if (loading) {
    return <SiteLayout><div className="container mx-auto px-4 py-8" dir="rtl"><Skeleton className="h-96 w-full" /></div></SiteLayout>;
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">המוצר לא נמצא</h1>
          <Link to="/shop"><Button className="mt-4">חזרה לחנות</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  const hasSale = product.sale_price && product.sale_price < product.price;
  const finalPrice = hasSale ? product.sale_price! : product.price;
  const outOfStock = product.manage_stock && product.stock_quantity <= 0;

  // Smart Rhythms detection by category slug — used only to choose the organ preview UI.
  const isSmartRhythm = !!categorySlug && ["BITS", "smart-rhythms", "rhythms", "מקצבים"].includes(categorySlug);
  const organSamples =
    (product.custom_fields && (product.custom_fields as any).organ_samples) as Record<string, string> | undefined;

  // File enforcement: strictly derived from the linked rhythm set's requires_info_file flag.
  // If no linked rhythm set, or the set does not require a file, no pre-checkout dropzone is shown.
  const cpiRequired = !!linkedRhythmSet?.requires_info_file;
  const cpiExtension = linkedRhythmSet?.info_file_extension || ".n27";
  const canAddToCart = !outOfStock && (!cpiRequired || !!cpiFile);

  const addToCart = () => {
    if (cpiRequired && !cpiFile) {
      toast.error(`חובה להעלות קובץ ${cpiExtension} לפני הוספה לסל`);
      return;
    }
    const cart = JSON.parse(localStorage.getItem("shop_cart") || "[]");
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
      if (cpiFile) existing.cpi_file = cpiFile;
    } else {
      cart.push({
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: finalPrice,
        image: product.main_image,
        qty,
        product_type: product.product_type,
        ...(cpiFile ? { cpi_file: cpiFile } : {}),
      });
    }
    localStorage.setItem("shop_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("shop_cart_updated"));
    toast.success("נוסף לסל הקניות");
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 md:px-8" dir="rtl">
        <Link to="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> חזרה לחנות
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5">
              {activeImg ? (
                <img src={activeImg} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><ShoppingBag className="h-20 w-20 text-muted-foreground/30" /></div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {allImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(img.image_url)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${activeImg === img.image_url ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img.image_url} alt={img.alt_text ?? ""} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {isSmartRhythm ? (
              <div className="mt-4 space-y-3">
                {/* Manual keyboard model selector — dark/gold theme */}
                <div
                  className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-zinc-900 to-black p-3"
                  dir="rtl"
                >
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300/90">
                    <Piano className="h-3.5 w-3.5" />
                    בחר באורגן שלך
                  </label>
                  <Select value={activeModelId ?? undefined} onValueChange={onPickModel}>
                    <SelectTrigger className="w-full border-amber-500/30 bg-zinc-950/60 text-zinc-100 hover:border-amber-400/60">
                      <SelectValue placeholder="בחר דגם אורגן/קלידים…" />
                    </SelectTrigger>
                    <SelectContent>
                      {keyboardModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.brand?.name ? `${m.brand.name} · ` : ""}{m.model_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-[10px] text-zinc-500">
                    הבחירה מחליפה את עיצוב הנגן בזמן אמת ושומרת את העדפתך.
                  </p>
                </div>
                <VirtualOrganPreview samples={organSamples} fallbackAudio={product.audio_demo_url} modelId={activeModelId} />
              </div>
            ) : (
              (product.audio_demo_url || product.video_demo_url) && (
                <Card className="mt-4 p-4">
                  <h3 className="mb-2 font-semibold">הדגמה</h3>
                  {product.audio_demo_url && <audio controls src={product.audio_demo_url} className="w-full" />}
                  {product.video_demo_url && (
                    <video controls src={product.video_demo_url} className="mt-2 w-full rounded-lg" />
                  )}
                </Card>
              )
            )}
          </div>

          {/* Details */}
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {(product.status_tags ?? []).map((tag) => {
                const def = STATUS_TAG_OPTIONS.find((t) => t.value === tag);
                if (!def) return null;
                return <Badge key={tag} className={`${def.color} text-white border-0`}>{def.label}</Badge>;
              })}
              <Badge variant="outline">{PRODUCT_TYPE_LABEL[product.product_type]}</Badge>
            </div>

            {product.brand && <p className="text-sm uppercase tracking-wide text-muted-foreground">{product.brand}{product.model && ` · ${product.model}`}</p>}
            <h1 className="mb-3 text-3xl font-bold">{product.title}</h1>
            {product.short_description && <p className="mb-4 text-muted-foreground">{product.short_description}</p>}

            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatILS(finalPrice)}</span>
              {hasSale && <span className="text-lg text-muted-foreground line-through">{formatILS(product.price)}</span>}
            </div>

            {outOfStock ? (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-destructive font-semibold text-center">המוצר אזל מהמלאי</div>
            ) : (
              <>
                {cpiRequired && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold">קובץ זיהוי הקלידים <span className="text-destructive">*</span></h3>
                    <CpiDropzone productId={product.id} value={cpiFile} onChange={setCpiFile} />
                  </div>
                )}
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
                    <span className="w-12 text-center font-bold">{qty}</span>
                    <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)}>+</Button>
                  </div>
                  <Button size="lg" className="flex-1" onClick={addToCart} disabled={!canAddToCart}>
                    <ShoppingBag className="ml-2 h-4 w-4" />
                    {cpiRequired && !cpiFile ? "העלה קובץ זיהוי כדי להוסיף לסל" : "הוסף לסל"}
                  </Button>
                </div>
              </>
            )}

            <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg border p-3"><Truck className="mx-auto mb-1 h-5 w-5 text-primary" />משלוח מהיר</div>
              <div className="rounded-lg border p-3"><ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />אחריות יצרן</div>
              <div className="rounded-lg border p-3"><Package className="mx-auto mb-1 h-5 w-5 text-primary" />החזרה תוך 14 יום</div>
            </div>

            {product.description && (
              <Card className="p-4">
                <h2 className="mb-2 text-lg font-semibold">תיאור המוצר</h2>
                {/^\s*<\w+/.test(product.description) ? (
                  <div
                    className="prose prose-sm max-w-none text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5 [&_a]:text-primary [&_a]:underline"
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{product.description}</div>
                )}
              </Card>
            )}

            {product.warranty_terms && (
              <Card className="mt-4 p-4">
                <h2 className="mb-2 text-lg font-semibold">תנאי אחריות</h2>
                <div className="whitespace-pre-wrap text-sm">{product.warranty_terms}</div>
              </Card>
            )}

            {product.custom_fields && Object.keys(product.custom_fields).length > 0 && (
              <Card className="mt-4 p-4">
                <h2 className="mb-3 text-lg font-semibold">מפרט</h2>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(product.custom_fields).map(([k, v]) => (
                    <div key={k}><dt className="font-semibold text-muted-foreground">{k}:</dt><dd>{String(v)}</dd></div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA — mobile only */}
      {!outOfStock && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3 py-2.5 flex items-center gap-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] text-muted-foreground">סה״כ</span>
            <span className="text-base font-bold text-primary">{formatILS(finalPrice * qty)}</span>
          </div>
          <Button size="lg" className="flex-1 h-11" onClick={addToCart} disabled={!canAddToCart}>
            <ShoppingBag className="ml-2 h-4 w-4" />
            {cpiRequired && !cpiFile ? "נדרש קובץ זיהוי" : "הוסף לסל"}
          </Button>
        </div>
      )}
    </SiteLayout>
  );
}
