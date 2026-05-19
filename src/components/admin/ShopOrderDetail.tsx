import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2, ArrowRight, RefreshCcw, Ban, CheckCircle2, Clock, Truck, CreditCard,
  Download, FileText, User, ExternalLink, AlertTriangle, ShieldCheck, History,
} from "lucide-react";
import { toast } from "sonner";

type Order = any;
type Item = any;
type Conv = any;
type HistoryRow = any;

const STATUS_LABEL: Record<string, string> = {
  pending: "התקבלה", paid: "שולמה", processing: "בעיבוד", shipped: "נשלחה",
  completed: "הושלמה", cancelled: "בוטלה", refunded: "הוחזרה",
};

const TIMELINE = [
  { key: "pending", label: "התקבלה", icon: Clock },
  { key: "paid", label: "שולמה", icon: CreditCard },
  { key: "processing", label: "בעיבוד / קידוד", icon: RefreshCcw },
  { key: "shipped", label: "נשלחה", icon: Truck },
  { key: "completed", label: "הושלמה", icon: CheckCircle2 },
];

const ORDER_INDEX: Record<string, number> = {
  pending: 0, paid: 1, processing: 2, shipped: 3, completed: 4,
  cancelled: -1, refunded: -1,
};

export function ShopOrderDetail({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [conversions, setConversions] = useState<Conv[]>([]);
  const [rhythmOrder, setRhythmOrder] = useState<any>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [retrigBusy, setRetrigBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: ord, error: e1 } = await supabase.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
    if (e1 || !ord) { toast.error(e1?.message ?? "ההזמנה לא נמצאה"); setLoading(false); return; }
    setOrder(ord);

    const [{ data: its }, { data: prof }, { data: convs }, { data: hist }] = await Promise.all([
      supabase.from("shop_order_items").select("*").eq("order_id", orderId),
      ord.customer_id
        ? supabase.from("profiles").select("id, display_name, email, avatar_url").eq("id", ord.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("affiliate_conversions").select("*, affiliates(id, ref_code, user_id, total_paid, total_earned)").eq("order_id", orderId),
      supabase.from("shop_order_history" as any).select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
    ]);
    setItems((its ?? []) as Item[]);
    setProfile(prof ?? null);
    setConversions((convs ?? []) as Conv[]);
    setHistory((hist ?? []) as HistoryRow[]);

    // Try fetching the linked rhythm_order (when order has rhythm items, customer + set match)
    const rhythmItem = (its ?? []).find((i: any) => i.fulfillment_kind === "rhythm_set");
    if (rhythmItem && ord.customer_id) {
      const { data: ro } = await supabase
        .from("rhythm_orders" as any)
        .select("*")
        .eq("user_id", ord.customer_id)
        .eq("rhythm_set_id", rhythmItem.fulfillment_ref_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRhythmOrder(ro);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [orderId]);

  const retriggerCpi = async () => {
    if (!rhythmOrder) return;
    setRetrigBusy(true);
    const { error } = await supabase.rpc("admin_retrigger_cpi_webhook" as any, { p_rhythm_order_id: rhythmOrder.id });
    setRetrigBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("ה-Webhook הופעל מחדש"); void load(); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!order) {
    return <p className="text-center py-10 text-muted-foreground">ההזמנה לא נמצאה</p>;
  }

  const digitalItems = items.filter((i) => i.product_type !== "physical");
  const physicalItems = items.filter((i) => i.product_type === "physical");
  const stageIdx = ORDER_INDEX[order.status] ?? -1;
  const isRefundedOrCancelled = order.status === "refunded" || order.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin/commerce/orders"><ArrowRight className="ml-1 h-4 w-4" />חזרה להזמנות</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            הזמנה <span className="font-mono text-base text-muted-foreground">#{order.order_number}</span>
          </h1>
          <p className="text-sm text-muted-foreground">נוצרה ב-{new Date(order.created_at).toLocaleString("he-IL")}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <Badge variant={order.payment_status === "paid" ? "default" : order.payment_status === "refunded" ? "destructive" : "secondary"}>
            {order.payment_status}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          {isRefundedOrCancelled ? (
            <div className="flex items-center justify-center gap-2 py-4 text-destructive">
              <Ban className="h-5 w-5" />
              <span className="font-semibold">{order.status === "refunded" ? "ההזמנה הוחזרה" : "ההזמנה בוטלה"}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between" dir="rtl">
              {TIMELINE.map((stage, idx) => {
                const Icon = stage.icon;
                const active = idx <= stageIdx;
                return (
                  <div key={stage.key} className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${active ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`mt-2 text-xs ${active ? "font-semibold" : "text-muted-foreground"}`}>{stage.label}</span>
                    {idx < TIMELINE.length - 1 && (
                      <div className={`absolute h-0.5 ${idx < stageIdx ? "bg-primary" : "bg-border"}`} style={{ display: "none" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: items + actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />לקוח</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">שם: </span>{order.customer_name ?? profile?.display_name ?? "—"}</div>
              <div><span className="text-muted-foreground">מייל: </span>{order.customer_email ?? profile?.email ?? "—"}</div>
              <div><span className="text-muted-foreground">טלפון: </span>{order.customer_phone ?? "—"}</div>
              {order.customer_id && (
                <Button asChild variant="link" size="sm" className="px-0">
                  <Link to="/admin/customers/$customerId" params={{ customerId: order.customer_id }}>
                    פתח פרופיל לקוח <ExternalLink className="mr-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Digital items */}
          {digitalItems.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">מוצרים דיגיטליים ({digitalItems.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>פריט</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>כמות</TableHead>
                      <TableHead>סכום</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {digitalItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.product_title}</TableCell>
                        <TableCell><Badge variant="outline">{i.fulfillment_kind ?? i.product_type}</Badge></TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{order.currency} {Number(i.total_price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Physical items */}
          {physicalItems.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">מוצרים פיזיים ({physicalItems.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>פריט</TableHead>
                      <TableHead>מק"ט</TableHead>
                      <TableHead>כמות</TableHead>
                      <TableHead>סכום</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {physicalItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.product_title}</TableCell>
                        <TableCell className="font-mono text-xs">{i.product_sku ?? "—"}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{order.currency} {Number(i.total_price).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {order.shipping_address && (
                  <div className="mt-4 p-3 rounded-md bg-muted text-xs">
                    <div className="font-semibold mb-1">כתובת משלוח</div>
                    <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(order.shipping_address, null, 2)}</pre>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">מעקב: </span>
                    {order.shipping_carrier} — <span className="font-mono">{order.tracking_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rhythm CPI */}
          {(digitalItems.some((i) => i.fulfillment_kind === "rhythm_set") || rhythmOrder || order.info_file_url) && (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />עיבוד CPI (קצב)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">סטטוס: </span><Badge variant="outline">{rhythmOrder?.status ?? "—"}</Badge></div>
                  {(rhythmOrder?.info_file_url || order.info_file_url) && (
                    <Button asChild variant="outline" size="sm">
                      <a href={rhythmOrder?.info_file_url ?? order.info_file_url} target="_blank" rel="noreferrer">
                        <Download className="ml-1 h-4 w-4" />הורד קובץ .n27 / .info
                      </a>
                    </Button>
                  )}
                  {rhythmOrder?.cpi_file_url && (
                    <Button asChild variant="outline" size="sm" className="mr-2">
                      <a href={rhythmOrder.cpi_file_url} target="_blank" rel="noreferrer">
                        <Download className="ml-1 h-4 w-4" />הורד CPI מוכן
                      </a>
                    </Button>
                  )}
                </div>
                {rhythmOrder && (
                  <Button onClick={() => void retriggerCpi()} disabled={retrigBusy} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {retrigBusy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <RefreshCcw className="ml-1 h-4 w-4" />}
                    🔄 סנכרן והפעל קידוד מחדש
                  </Button>
                )}
                {!rhythmOrder && digitalItems.some((i) => i.fulfillment_kind === "rhythm_set") && (
                  <p className="text-xs text-muted-foreground">לא נמצאה רשומת rhythm_order מקושרת — ייתכן שהלקוח עוד לא העלה קובץ .n27.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order history */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />יומן פעולות</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין פעולות עדיין</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="border rounded p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{h.action}</Badge>
                        <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("he-IL")}</span>
                      </div>
                      {h.reason && <p className="mt-1">{h.reason}</p>}
                      {h.amount && <p className="mt-1 text-muted-foreground">סכום: {order.currency} {Number(h.amount).toFixed(2)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: summary + danger zone + affiliate */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">סיכום</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="סכום ביניים" value={`${order.currency} ${Number(order.subtotal).toFixed(2)}`} />
              {order.discount_amount > 0 && <Row label={`הנחה${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`-${order.currency} ${Number(order.discount_amount).toFixed(2)}`} />}
              {order.shipping_amount > 0 && <Row label="משלוח" value={`${order.currency} ${Number(order.shipping_amount).toFixed(2)}`} />}
              {order.tax_amount > 0 && <Row label="מע״מ" value={`${order.currency} ${Number(order.tax_amount).toFixed(2)}`} />}
              {order.points_redeemed > 0 && <Row label={`נקודות (${order.points_redeemed})`} value={`-${order.currency} ${Number(order.points_discount_amount).toFixed(2)}`} />}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>סה״כ</span>
                <span>{order.currency} {Number(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                אמצעי תשלום: {order.payment_method ?? "—"}
                {order.external_payment_id && <div className="font-mono">#{order.external_payment_id}</div>}
              </div>
            </CardContent>
          </Card>

          {/* Affiliate */}
          <Card>
            <CardHeader><CardTitle className="text-base">שותפים (Affiliate)</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {conversions.length === 0 ? (
                <p className="text-muted-foreground">הזמנה זו לא הגיעה דרך שותף.</p>
              ) : conversions.map((c) => (
                <div key={c.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{c.affiliates?.ref_code}</span>
                    <Badge variant={c.status === "approved" || c.status === "paid" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="text-xs">עמלה: <span className="font-semibold">{order.currency} {Number(c.commission_amount).toFixed(2)}</span> ({c.commission_percent}%)</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      const { error } = await supabase.rpc("admin_set_affiliate_conversion_status" as any, { p_conversion_id: c.id, p_status: "approved" });
                      if (error) toast.error(error.message); else { toast.success("אושר"); void load(); }
                    }} disabled={c.status === "approved" || c.status === "paid"}>אשר</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const { error } = await supabase.rpc("admin_set_affiliate_conversion_status" as any, { p_conversion_id: c.id, p_status: "on_hold" });
                      if (error) toast.error(error.message); else { toast.success("הוקפא"); void load(); }
                    }}>הקפא</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      const { error } = await supabase.rpc("admin_set_affiliate_conversion_status" as any, { p_conversion_id: c.id, p_status: "rejected" });
                      if (error) toast.error(error.message); else { toast.success("נדחה"); void load(); }
                    }}>דחה</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />אזור מסוכן</CardTitle></CardHeader>
            <CardContent>
              <RefundDialog order={order} onDone={() => void load()} disabled={isRefundedOrCancelled} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}

function StatusBadge({ status }: { status: string }) {
  const variant: any = status === "completed" ? "default" : status === "refunded" || status === "cancelled" ? "destructive" : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function RefundDialog({ order, onDone, disabled }: { order: Order; onDone: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<string>(String(order.total_amount));
  const [full, setFull] = useState(true);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) { toast.error("יש למלא סיבה"); return; }
    setBusy(true);
    const { error, data } = await supabase.rpc("admin_refund_shop_order" as any, {
      p_order_id: order.id,
      p_reason: reason.trim(),
      p_amount: Number(amount),
      p_full_refund: full,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const meta = data as any;
    toast.success(
      `✅ החזר בוצע בהצלחה. נחסמה גישת המשתמש ל-${meta?.revoked_items ?? 0} נכסים דיגיטליים (קורסים / דרגות פרימיום) ונדחו ${meta?.affiliate_conversions_rejected ?? 0} עמלות שותפים.`,
      { duration: 6000 },
    );
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full" disabled={disabled}>
          <Ban className="ml-1 h-4 w-4" />🔴 בטל הזמנה ובצע החזר
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>החזר / ביטול הזמנה #{order.order_number}</DialogTitle>
          <DialogDescription>פעולה זו תסמן את ההזמנה כמוחזרת, תבטל גישה לתכנים דיגיטליים שהוקנו ותדחה עמלות שותפים תלויות.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>סיבה</Label>
            <Textarea placeholder="לדוגמה: חרטת לקוח / טעות בהזמנה" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>סכום החזר ({order.currency})</Label>
              <Input type="number" step="0.01" min="0" max={order.total_amount} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={full} onChange={(e) => { setFull(e.target.checked); if (e.target.checked) setAmount(String(order.total_amount)); }} />
                החזר מלא + ביטול גישות
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy || !reason.trim()}>
                {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="ml-1 h-4 w-4" />}
                בצע החזר
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>לאשר את הפעולה?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-right">
                  <span className="block">⚠️ שים לב: ביצוע החזר יחסום מיידית את גישת המשתמש לקורסים או לדרגות הפרימיום הכלולות בהזמנה זו.</span>
                  <span className="block text-muted-foreground">ההזמנה תסומן כ-refunded, ההרשמות לאקדמיה יבוטלו, דרגת ה-VIP תאופס ל-Free, ועמלות שותפים תלויות יידחו. הפעולה אינה הפיכה.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirm()}>אישור והחזר</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => setOpen(false)}>סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
