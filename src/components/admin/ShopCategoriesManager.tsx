import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Tags, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/shopUtils";

type Category = { id: string; slug: string; label: string; description: string | null; image_url: string | null; display_order: number; is_active: boolean };

export function ShopCategoriesManager() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("shop_categories").select("*").order("display_order");
    setItems((data as Category[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label) return toast.error("נדרש שם קטגוריה");
    const payload: any = { ...editing, slug: editing.slug || slugify(editing.label) };
    const { error } = editing.id
      ? await supabase.from("shop_categories").update(payload).eq("id", editing.id)
      : await supabase.from("shop_categories").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("נשמר");
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק קטגוריה?")) return;
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    load();
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Tags className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">קטגוריות חנות</h2></div>
        <Button onClick={() => { setEditing({ display_order: 0, is_active: true }); setOpen(true); }}><Plus className="ml-1 h-4 w-4" /> חדש</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin" /> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs text-muted-foreground">/{c.slug} · {c.is_active ? "פעיל" : "כבוי"}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-4">אין קטגוריות</p>}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "עריכה" : "קטגוריה חדשה"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>שם</Label><Input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="אוטומטי לפי השם" /></div>
              <div><Label>תיאור</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>סדר תצוגה</Label><Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> פעיל</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button><Button onClick={save}>שמור</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
