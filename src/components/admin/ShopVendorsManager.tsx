import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Vendor = { id: string; company_name: string; contact_name: string | null; phone: string | null; email: string | null; vendor_type: string; payment_notes: string | null; notes: string | null; is_active: boolean };

export function ShopVendorsManager() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Vendor> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("shop_vendors").select("*").order("created_at", { ascending: false });
    setItems((data as Vendor[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.company_name) return toast.error("נדרש שם חברה");
    const payload: any = editing;
    const { error } = editing.id
      ? await supabase.from("shop_vendors").update(payload).eq("id", editing.id)
      : await supabase.from("shop_vendors").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("נשמר"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק ספק?")) return;
    await supabase.from("shop_vendors").delete().eq("id", id);
    load();
  };

  return (
    <Card className="p-4" dir="rtl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">ספקים ויבואנים</h2></div>
        <Button onClick={() => { setEditing({ vendor_type: "in_house", is_active: true }); setOpen(true); }}><Plus className="ml-1 h-4 w-4" /> חדש</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin" /> : (
        <div className="grid gap-2">
          {items.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-semibold">{v.company_name} <span className="text-xs text-muted-foreground">({v.vendor_type === "dropship" ? "דרופשיפינג" : "מלאי עצמי"})</span></div>
                <div className="text-xs text-muted-foreground">{v.contact_name} · {v.phone} · {v.email}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-4">אין ספקים</p>}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing?.id ? "עריכה" : "ספק חדש"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>שם חברה *</Label><Input value={editing.company_name ?? ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></div>
              <div><Label>איש קשר</Label><Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>טלפון</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div><Label>אימייל</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              </div>
              <div>
                <Label>סוג</Label>
                <Select value={editing.vendor_type} onValueChange={(v) => setEditing({ ...editing, vendor_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_house">מלאי עצמי</SelectItem>
                    <SelectItem value="dropship">דרופשיפינג</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>הערות תשלום</Label><Textarea rows={2} value={editing.payment_notes ?? ""} onChange={(e) => setEditing({ ...editing, payment_notes: e.target.value })} /></div>
              <div><Label>הערות</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> פעיל</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button><Button onClick={save}>שמור</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
