import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Trash2, CheckCircle2, XCircle, Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/shopUtils";

type Draft = {
  source_url: string;
  title: string;
  short_description: string;
  description: string;
  price: number;
  sale_price: number | null;
  currency: string;
  brand: string;
  model: string;
  sku: string;
  main_image: string | null;
  gallery: string[];
};

type ImportResult =
  | { ok: true; url: string; data: Draft }
  | { ok: false; url: string; error: string };

export function ShopProductImporter() {
  const [urlsText, setUrlsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [failed, setFailed] = useState<{ url: string; error: string }[]>([]);
  const [publishing, setPublishing] = useState(false);

  const importUrls = async () => {
    const urls = urlsText
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    if (urls.length === 0) return toast.error("הדבק לפחות לינק אחד");
    if (urls.length > 10) return toast.error("עד 10 לינקים בייבוא אחד");

    setLoading(true);
    setDrafts([]);
    setFailed([]);
    try {
      const { data, error } = await supabase.functions.invoke("import-product-from-url", {
        body: { urls },
      });
      if (error) throw error;
      const results: ImportResult[] = data?.results ?? [];
      const ok = results.filter((r): r is Extract<ImportResult, { ok: true }> => r.ok).map((r) => r.data);
      const bad = results
        .filter((r): r is Extract<ImportResult, { ok: false }> => !r.ok)
        .map((r) => ({ url: r.url, error: r.error }));
      setDrafts(ok);
      setFailed(bad);
      if (ok.length) toast.success(`יובאו ${ok.length} מוצרים — בדוק ועדכן לפני אישור`);
      if (bad.length) toast.error(`${bad.length} לינקים נכשלו`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "ייבוא נכשל");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const removeDraft = (i: number) => setDrafts((prev) => prev.filter((_, idx) => idx !== i));

  const removeImage = (i: number, imgIdx: number) => {
    const d = drafts[i];
    const next = d.gallery.filter((_, x) => x !== imgIdx);
    updateDraft(i, { gallery: next, main_image: next[0] ?? null });
  };

  const setMain = (i: number, img: string) => updateDraft(i, { main_image: img });

  const publishAll = async () => {
    if (drafts.length === 0) return;
    if (!confirm(`להעלות ${drafts.length} מוצרים לחנות כטיוטה?`)) return;
    setPublishing(true);
    let ok = 0;
    let fail = 0;
    for (const d of drafts) {
      const payload = {
        title: d.title,
        slug: slugify(d.title),
        short_description: d.short_description || null,
        description: d.description || null,
        product_type: "physical",
        fulfillment_type: "in_stock",
        status: "draft",
        brand: d.brand || null,
        model: d.model || null,
        sku: d.sku || null,
        price: d.price || 0,
        sale_price: d.sale_price,
        currency: d.currency || "ILS",
        manage_stock: true,
        stock_quantity: 0,
        main_image: d.main_image,
      };
      const { error } = await supabase.from("shop_products").insert(payload as any);
      if (error) {
        console.error(error);
        fail++;
      } else ok++;
    }
    setPublishing(false);
    if (ok) toast.success(`${ok} מוצרים נוספו כטיוטה`);
    if (fail) toast.error(`${fail} כשלו`);
    if (ok && !fail) {
      setDrafts([]);
      setUrlsText("");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">ייבוא מוצרים מ-URL</h2>
        <Badge variant="secondary">AI</Badge>
      </div>

      <div className="space-y-2">
        <Label>הדבק עד 10 לינקים (שורה לכל לינק או מופרדים בפסיקים)</Label>
        <Textarea
          rows={4}
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder="https://www.amazon.com/...&#10;https://www.aliexpress.com/item/...&#10;https://www.zap.co.il/..."
          disabled={loading}
        />
        <Button onClick={importUrls} disabled={loading}>
          {loading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Download className="ml-1 h-4 w-4" />}
          ייבא וחלץ נתונים
        </Button>
      </div>

      {failed.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="font-bold mb-1 flex items-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" /> לינקים שנכשלו:
          </div>
          {failed.map((f, i) => (
            <div key={i} className="text-xs text-muted-foreground truncate">
              {f.url} — {f.error}
            </div>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">סקירה ועריכה ({drafts.length})</h3>
            <Button onClick={publishAll} disabled={publishing} size="lg">
              {publishing ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-1 h-4 w-4" />}
              אשר והעלה הכל לחנות
            </Button>
          </div>

          {drafts.map((d, i) => (
            <Card key={i} className="p-4 space-y-3 border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground truncate flex-1">מקור: {d.source_url}</div>
                <Button size="icon" variant="ghost" onClick={() => removeDraft(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>שם המוצר</Label>
                  <Input value={d.title} onChange={(e) => updateDraft(i, { title: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>תיאור קצר</Label>
                  <Input value={d.short_description} onChange={(e) => updateDraft(i, { short_description: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>תיאור מלא</Label>
                  <Textarea rows={4} value={d.description} onChange={(e) => updateDraft(i, { description: e.target.value })} />
                </div>
                <div>
                  <Label>מותג</Label>
                  <Input value={d.brand} onChange={(e) => updateDraft(i, { brand: e.target.value })} />
                </div>
                <div>
                  <Label>דגם</Label>
                  <Input value={d.model} onChange={(e) => updateDraft(i, { model: e.target.value })} />
                </div>
                <div>
                  <Label>מחיר (₪)</Label>
                  <Input
                    type="number"
                    value={d.price}
                    onChange={(e) => updateDraft(i, { price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>מחיר מבצע (אופציונלי)</Label>
                  <Input
                    type="number"
                    value={d.sale_price ?? ""}
                    onChange={(e) =>
                      updateDraft(i, { sale_price: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={d.sku} onChange={(e) => updateDraft(i, { sku: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> תמונות ({d.gallery.length})</Label>
                {d.gallery.length === 0 && <div className="text-xs text-muted-foreground">לא נמצאו תמונות</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.gallery.map((img, x) => (
                    <div key={x} className="relative">
                      <img
                        src={img}
                        className={`h-20 w-20 rounded object-cover cursor-pointer border-2 ${
                          d.main_image === img ? "border-primary" : "border-transparent"
                        }`}
                        onClick={() => setMain(i, img)}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i, x)}
                        className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-destructive text-white text-xs"
                      >
                        ×
                      </button>
                      {d.main_image === img && (
                        <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px]">ראשית</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
