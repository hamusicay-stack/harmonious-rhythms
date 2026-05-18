import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Save, Trash2, Pencil, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Supplier = { id: string; company_name: string };

type OrderItem = { name: string; quantity: number; price: number };

type SupplierOrder = {
  id: string;
  supplier_id: string;
  order_number: string | null;
  items: OrderItem[];
  total_amount: number;
  currency: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: "draft" | "sent" | "received" | "paid" | "cancelled";
  notes: string | null;
};

const STATUS_LABELS: Record<SupplierOrder["status"], string> = {
  draft: "טיוטה",
  sent: "נשלחה",
  received: "התקבלה",
  paid: "שולמה",
  cancelled: "בוטלה",
};

const STATUS_COLORS: Record<SupplierOrder["status"], "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  sent: "secondary",
  received: "default",
  paid: "default",
  cancelled: "destructive",
};

export function SupplierOrdersManager({ supplierId }: { supplierId?: string }) {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("supplier_orders").select("*").order("order_date", { ascending: false });
    if (supplierId) q = q.eq("supplier_id", supplierId);
    const [ordersRes, suppliersRes] = await Promise.all([
      q,
      supabase.from("suppliers").select("id, company_name").order("company_name"),
    ]);
    if (ordersRes.error) toast.error("שגיאה בטעינת הזמנות");
    setOrders((ordersRes.data ?? []) as unknown as SupplierOrder[]);
    setSuppliers((suppliersRes.data ?? []) as Supplier[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [supplierId]);

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את ההזמנה?")) return;
    const { error } = await supabase.from("supplier_orders").delete().eq("id", id);
    if (error) return toast.error("שגיאה במחיקה");
    toast.success("ההזמנה נמחקה");
    load();
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.company_name ?? "—";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {supplierId ? "היסטוריית הזמנות" : `הזמנות רכש (${orders.length})`}
        </CardTitle>
        <SupplierOrderDialog suppliers={suppliers} defaultSupplierId={supplierId} onSaved={load} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מס׳ הזמנה</TableHead>
                  {!supplierId && <TableHead>ספק</TableHead>}
                  <TableHead>פריטים</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number || o.id.slice(0, 8)}</TableCell>
                    {!supplierId && <TableCell>{supplierName(o.supplier_id)}</TableCell>}
                    <TableCell className="text-xs">{(o.items ?? []).length} פריטים</TableCell>
                    <TableCell>₪{Number(o.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{new Date(o.order_date).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <SupplierOrderDialog suppliers={suppliers} order={o} onSaved={load} />
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={supplierId ? 6 : 7} className="py-8 text-center text-muted-foreground">
                      אין הזמנות עדיין
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierOrderDialog({
  suppliers,
  order,
  defaultSupplierId,
  onSaved,
}: {
  suppliers: Supplier[];
  order?: SupplierOrder;
  defaultSupplierId?: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    supplier_id: order?.supplier_id ?? defaultSupplierId ?? "",
    order_number: order?.order_number ?? "",
    items: order?.items ?? [{ name: "", quantity: 1, price: 0 }] as OrderItem[],
    order_date: toLocalInput(order?.order_date) || toLocalInput(new Date().toISOString()),
    expected_delivery_date: toLocalInput(order?.expected_delivery_date),
    status: order?.status ?? "draft" as SupplierOrder["status"],
    notes: order?.notes ?? "",
  });

  const total = form.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { name: "", quantity: 1, price: 0 }] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.supplier_id) return toast.error("יש לבחור ספק");
    const validItems = form.items.filter((it) => it.name.trim());
    if (validItems.length === 0) return toast.error("יש להוסיף לפחות פריט אחד");

    setSaving(true);
    const payload = {
      supplier_id: form.supplier_id,
      order_number: form.order_number.trim() || null,
      items: validItems,
      total_amount: total,
      order_date: new Date(form.order_date).toISOString(),
      expected_delivery_date: form.expected_delivery_date ? new Date(form.expected_delivery_date).toISOString() : null,
      status: form.status,
      notes: form.notes.trim() || null,
    };
    const { error } = order
      ? await supabase.from("supplier_orders").update(payload).eq("id", order.id)
      : await supabase.from("supplier_orders").insert(payload);
    setSaving(false);
    if (error) return toast.error(friendlyError(error, "שגיאה בשמירה"));
    toast.success(order ? "ההזמנה עודכנה" : "ההזמנה נוצרה");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {order ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="ml-2 h-4 w-4" />הזמנה חדשה</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>{order ? "עריכת הזמנה" : "הזמנת רכש חדשה"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pl-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ספק *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })} disabled={!!defaultSupplierId}>
                <SelectTrigger><SelectValue placeholder="בחר ספק" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מספר הזמנה</Label>
              <Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>פריטים *</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="ml-1 h-3 w-3" />הוסף פריט
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-6"
                    placeholder="שם הפריט"
                    value={it.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min="1"
                    placeholder="כמות"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="מחיר ₪"
                    value={it.price}
                    onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                  />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-end font-semibold">
              סה״כ: ₪{total.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>תאריך הזמנה</Label>
              <Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            </div>
            <div>
              <Label>אספקה צפויה</Label>
              <Input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SupplierOrder["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as SupplierOrder["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            שמירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
