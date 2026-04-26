import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { formatILS, slugify, PRODUCT_TYPE_LABEL, FULFILLMENT_LABEL, PRODUCT_STATUS_LABEL, STATUS_TAG_OPTIONS } from "@/lib/shopUtils";
import { RichTextEditor } from "@/components/RichTextEditor";

type Category = { id: string; label: string };
type Vendor = { id: string; company_name: string };
type Product = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  product_type: string;
  fulfillment_type: string;
  status: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  currency: string;
  manage_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  digital_file_url: string | null;
  digital_file_name: string | null;
  download_limit: number;
  download_expiry_days: number;
  warranty_terms: string | null;
  main_image: string | null;
  audio_demo_url: string | null;
  video_demo_url: string | null;
  category_id: string | null;
  vendor_id: string | null;
  status_tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_featured: boolean;
  created_at: string;
};

const emptyProduct: Partial<Product> = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  product_type: "physical",
  fulfillment_type: "in_stock",
  status: "draft",
  brand: "",
  model: "",
  sku: "",
  price: 0,
  sale_price: null,
  currency: "ILS",
  manage_stock: true,
  stock_quantity: 0,
  low_stock_threshold: 5,
  download_limit: 5,
  download_expiry_days: 30,
  status_tags: [],
};

export function ShopProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: v }] = await Promise.all([
      supabase.from("shop_products").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("id,label").order("display_order"),
      supabase.from("shop_vendors").select("id,company_name").eq("is_active", true),
    ]);
    setProducts((p as Product[]) ?? []);
    setCategories((c as Category[]) ?? []);
    setVendors((v as Vendor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...emptyProduct }); setOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setOpen(true); };

  const save = async () => {
    if (!editing?.title) return toast.error("יש להזין שם מוצר");
    setSaving(true);
    const slug = editing.slug || slugify(editing.title);
    const payload: any = { ...editing, slug };
    if (payload.sale_price === "" || payload.sale_price === undefined) payload.sale_price = null;
    if (payload.cost_price === "" || payload.cost_price === undefined) payload.cost_price = null;
    if (!payload.category_id) payload.category_id = null;
    if (!payload.vendor_id) payload.vendor_id = null;

    const { error } = editing.id
      ? await supabase.from("shop_products").update(payload).eq("id", editing.id)
      : await supabase.from("shop_products").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "המוצר עודכן" : "המוצר נוסף");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את המוצר?")) return;
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק");
    load();
  };

  const toggleStatus = async (p: Product) => {
    const newStatus = p.status === "active" ? "draft" : "active";
    await supabase.from("shop_products").update({ status: newStatus }).eq("id", p.id);
    load();
  };

  const uploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("shop-products").upload(path, file);
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("shop-products").getPublicUrl(path);
    setEditing({ ...editing, main_image: data.publicUrl });
    setUploading(false);
    toast.success("התמונה הועלתה");
  };

  const uploadDigital = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("shop-digital").upload(path, file);
    if (error) { setUploading(false); return toast.error(error.message); }
    setEditing({ ...editing, digital_file_url: path, digital_file_name: file.name });
    setUploading(false);
    toast.success("הקובץ הועלה");
  };

  const filtered = products.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="p-4" dir="rtl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">מוצרים בחנות</h2>
          <Badge variant="secondary">{products.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי שם / מותג / SKU" className="w-64" />
          <Button onClick={openNew}><Plus className="ml-1 h-4 w-4" /> מוצר חדש</Button>
        </div>
      </div>

      {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תמונה</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>מלאי</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.main_image ? <img src={p.main_image} className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-muted" />}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{p.title}</div>
                    {p.brand && <div className="text-xs text-muted-foreground">{p.brand} {p.model}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{PRODUCT_TYPE_LABEL[p.product_type]}</Badge></TableCell>
                  <TableCell>
                    <div className="font-bold">{formatILS(p.sale_price ?? p.price)}</div>
                    {p.sale_price && <div className="text-xs text-muted-foreground line-through">{formatILS(p.price)}</div>}
                  </TableCell>
                  <TableCell>
                    {p.manage_stock ? (
                      <span className={p.stock_quantity <= p.low_stock_threshold ? "text-orange-600 font-bold" : ""}>{p.stock_quantity}</span>
                    ) : <span className="text-muted-foreground">∞</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{PRODUCT_STATUS_LABEL[p.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus(p)} title={p.status === "active" ? "כבה" : "הפעל"}>
                        {p.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">אין מוצרים</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing?.id ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>שם המוצר *</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={editing.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>תיאור קצר</Label>
                <Input value={editing.short_description ?? ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>תיאור מלא</Label>
                <RichTextEditor
                  value={editing.description ?? ""}
                  onChange={(html) => setEditing({ ...editing, description: html })}
                  placeholder="הקלד תיאור מפורט למוצר... תומך בעיצוב, רשימות וקישורים."
                  rows={6}
                />
              </div>

              <div>
                <Label>סוג מוצר</Label>
                <Select value={editing.product_type} onValueChange={(v) => setEditing({ ...editing, product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג מילוי</Label>
                <Select value={editing.fulfillment_type} onValueChange={(v) => setEditing({ ...editing, fulfillment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>מותג</Label>
                <Input value={editing.brand ?? ""} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
              </div>
              <div>
                <Label>דגם</Label>
                <Input value={editing.model ?? ""} onChange={(e) => setEditing({ ...editing, model: e.target.value })} />
              </div>

              <div>
                <Label>מחיר (₪)</Label>
                <Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>מחיר מבצע (אופציונלי)</Label>
                <Input type="number" value={editing.sale_price ?? ""} onChange={(e) => setEditing({ ...editing, sale_price: e.target.value ? Number(e.target.value) : null })} />
              </div>

              <div>
                <Label>מלאי</Label>
                <Input type="number" value={editing.stock_quantity ?? 0} onChange={(e) => setEditing({ ...editing, stock_quantity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>סף מלאי נמוך (התראה)</Label>
                <Input type="number" value={editing.low_stock_threshold ?? 5} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value) })} />
              </div>

              <div>
                <Label>קטגוריה</Label>
                <Select value={editing.category_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ספק / יבואן</Label>
                <Select value={editing.vendor_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, vendor_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>תמונה ראשית</Label>
                <div className="flex items-center gap-2">
                  {editing.main_image && <img src={editing.main_image} className="h-16 w-16 rounded object-cover" />}
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} disabled={uploading} />
                </div>
              </div>

              {(editing.product_type === "digital" || editing.product_type === "hybrid") && (
                <div className="md:col-span-2 rounded-lg border p-3 bg-muted/30">
                  <Label className="font-bold">קובץ דיגיטלי</Label>
                  <div className="mt-2 flex items-center gap-2">
                    {editing.digital_file_name && <Badge>{editing.digital_file_name}</Badge>}
                    <Input type="file" onChange={(e) => e.target.files?.[0] && uploadDigital(e.target.files[0])} disabled={uploading} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">מקסימום הורדות</Label>
                      <Input type="number" value={editing.download_limit ?? 5} onChange={(e) => setEditing({ ...editing, download_limit: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">תוקף לינק (ימים)</Label>
                      <Input type="number" value={editing.download_expiry_days ?? 30} onChange={(e) => setEditing({ ...editing, download_expiry_days: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <Label>תנאי אחריות</Label>
                <Textarea rows={2} value={editing.warranty_terms ?? ""} onChange={(e) => setEditing({ ...editing, warranty_terms: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <Label>תגיות סטטוס</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_TAG_OPTIONS.map((tag) => {
                    const active = editing.status_tags?.includes(tag.value);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => {
                          const tags = editing.status_tags ?? [];
                          setEditing({ ...editing, status_tags: active ? tags.filter((t) => t !== tag.value) : [...tags, tag.value] });
                        }}
                        className={`rounded-full px-3 py-1 text-xs ${active ? `${tag.color} text-white` : "bg-muted"}`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 rounded-lg border p-3 bg-muted/30">
                <Label className="font-bold">SEO</Label>
                <div className="mt-2 space-y-2">
                  <Input placeholder="Meta Title (לתוצאות גוגל)" value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                  <Textarea rows={2} placeholder="Meta Description" value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>סטטוס פרסום</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> מוצר מומלץ</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="ml-1 h-4 w-4 animate-spin" />} שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
