import { useEffect, useRef, useState } from "react";
import { Tags, Plus, Trash2, Loader2, Upload, X, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Category = {
  id: string;
  slug: string;
  label: string;
  image_url: string | null;
  subcategories: string[];
  display_order: number;
  is_active: boolean;
};

export function MarketplaceCategoriesManager() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketplace_categories").select("*").order("display_order");
    setItems((data ?? []) as Category[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("למחוק את הקטגוריה?")) return;
    const { error } = await supabase.from("marketplace_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    load();
  };

  const toggleActive = async (c: Category) => {
    await supabase.from("marketplace_categories").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Tags className="h-4 w-4" />ניהול קטגוריות</h3>
          <p className="text-xs text-muted-foreground mt-1">הוסף, ערוך, סדר מחדש קטגוריות ראשיות. כל קטגוריה מקבלת דף משלה (/marketplace/category/...).</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />הוסף קטגוריה
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed">אין קטגוריות עדיין</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {c.image_url ? <img src={c.image_url} alt={c.label} className="w-full h-full object-cover" /> : <Tags className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  {c.label}
                  {!c.is_active && <Badge variant="secondary">לא פעיל</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">/{c.slug} · {c.subcategories.length} תתי-קטגוריות</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>ערוך</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryDialog open={open} onOpenChange={setOpen} editing={editing} maxOrder={items.length} onSaved={load} />
    </div>
  );
}

function CategoryDialog({ open, onOpenChange, editing, maxOrder, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Category | null; maxOrder: number; onSaved: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [subs, setSubs] = useState<string[]>([]);
  const [newSub, setNewSub] = useState("");
  const [order, setOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSlug(editing?.slug ?? "");
      setLabel(editing?.label ?? "");
      setImageUrl(editing?.image_url ?? null);
      setSubs(editing?.subcategories ?? []);
      setOrder(editing?.display_order ?? maxOrder + 1);
      setNewSub("");
    }
  }, [open, editing, maxOrder]);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("marketplace-categories").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("marketplace-categories").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const addSub = () => {
    const v = newSub.trim();
    if (!v || subs.includes(v)) return;
    setSubs([...subs, v]);
    setNewSub("");
  };

  const save = async () => {
    if (!slug.trim() || !label.trim()) { toast.error("שם וslug חובה"); return; }
    setSaving(true);
    const payload = {
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      label: label.trim(),
      image_url: imageUrl,
      subcategories: subs,
      display_order: order,
    };
    const { error } = editing
      ? await supabase.from("marketplace_categories").update(payload).eq("id", editing.id)
      : await supabase.from("marketplace_categories").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "עודכן" : "נוסף");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <Tags className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {imageUrl ? "החלף תמונה" : "העלה תמונה"}
              </Button>
              {imageUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setImageUrl(null)}><X className="h-3 w-3" />הסר</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>שם להצגה</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="גיטרות" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="guitars" dir="ltr" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>סדר תצוגה</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>תתי-קטגוריות</Label>
            <div className="flex gap-2">
              <Input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="הוסף תת-קטגוריה"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
              />
              <Button type="button" size="sm" onClick={addSub}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {subs.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pr-1">
                  {s}
                  <button onClick={() => setSubs(subs.filter((x) => x !== s))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {subs.length === 0 && <span className="text-xs text-muted-foreground">אין תתי-קטגוריות</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-4 w-4" />שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
