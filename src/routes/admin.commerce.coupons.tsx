import { requireAdmin } from "@/lib/routeGuards";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, TicketPercent } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commerce/coupons")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "ניהול קופונים — אדמין" }] }),
  component: CouponsManager,
});

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
};

const empty: Partial<Coupon> = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_amount: 0,
  max_uses: null,
  expires_at: null,
  is_active: true,
};

function CouponsManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shop_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<Coupon>) => {
      const payload: any = {
        code: (row.code ?? "").trim().toUpperCase(),
        description: row.description || null,
        discount_type: row.discount_type ?? "percent",
        discount_value: Number(row.discount_value ?? 0),
        min_order_amount: Number(row.min_order_amount ?? 0),
        max_uses: row.max_uses == null || (row.max_uses as any) === "" ? null : Number(row.max_uses),
        expires_at: row.expires_at || null,
        is_active: !!row.is_active,
      };
      if (!payload.code) throw new Error("חסר קוד");
      if (row.id) {
        const { error } = await (supabase as any).from("shop_coupons").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("shop_coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("נשמר בהצלחה");
      setDialogOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("shop_coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shop_coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הקופון נמחק");
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: any) => toast.error(e.message ?? "מחיקה נכשלה"),
  });

  const openNew = () => { setEditing({ ...empty }); setDialogOpen(true); };
  const openEdit = (c: Coupon) => { setEditing({ ...c }); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TicketPercent className="h-6 w-6 text-primary" />
            ניהול קופונים
          </h1>
          <p className="text-sm text-muted-foreground">קודי הנחה, אחוז/סכום קבוע, מגבלות שימוש ותוקף.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> קופון חדש</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "עריכת קופון" : "קופון חדש"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>קוד</Label>
                  <Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="WELCOME10" />
                </div>
                <div>
                  <Label>תיאור (אופציונלי)</Label>
                  <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>סוג הנחה</Label>
                    <Select value={editing.discount_type ?? "percent"} onValueChange={(v: any) => setEditing({ ...editing, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">אחוז (%)</SelectItem>
                        <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ערך</Label>
                    <Input type="number" min={0} value={editing.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>הזמנה מינימלית (₪)</Label>
                    <Input type="number" min={0} value={editing.min_order_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>מקסימום שימושים</Label>
                    <Input type="number" min={0} value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value === "" ? null : Number(e.target.value) })} placeholder="ללא הגבלה" />
                  </div>
                </div>
                <div>
                  <Label>תוקף עד</Label>
                  <Input type="datetime-local" value={editing.expires_at ? editing.expires_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <Label>פעיל</Label>
                  <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={() => editing && upsert.mutate(editing)} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>קופונים קיימים</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">עדיין אין קופונים. צור/י קופון ראשון.</div>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="rounded bg-muted px-2 py-1 text-sm font-bold tracking-wider">{c.code}</code>
                    <span className="text-sm font-medium">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `₪${c.discount_value}`}
                    </span>
                    {c.min_order_amount > 0 && <span className="text-xs text-muted-foreground">מינימום ₪{c.min_order_amount}</span>}
                    {c.max_uses != null && (
                      <span className="text-xs text-muted-foreground">{c.current_uses}/{c.max_uses}</span>
                    )}
                    {c.expires_at && (
                      <span className="text-xs text-muted-foreground">עד {new Date(c.expires_at).toLocaleDateString("he-IL")}</span>
                    )}
                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "פעיל" : "כבוי"}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: c.id, is_active: v })} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`למחוק את ${c.code}?`)) del.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
