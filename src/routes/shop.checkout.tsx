import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Loader2, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatILS } from "@/lib/shopUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/checkout")({
  head: () => ({
    meta: [
      { title: "תשלום — חנות המוזיקאי" },
      { name: "description", content: "סיום הזמנה ומסירת פרטי משלוח" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || (profile?.display_name ?? ""),
        customer_email: f.customer_email || (user.email ?? ""),
        customer_phone: f.customer_phone || (profile?.phone ?? ""),
      }));
    }
  }, [user, profile]);

  const hasPhysical = items.some((i) => i.product_type !== "digital");
  const shipping = hasPhysical && subtotal < 500 && subtotal > 0 ? 35 : 0;
  const total = subtotal + shipping;

  const submit = async () => {
    if (!form.customer_name.trim()) return toast.error("חסר שם מלא");
    if (!form.customer_email.trim()) return toast.error("חסר אימייל");
    if (!form.customer_phone.trim()) return toast.error("חסר טלפון");
    if (hasPhysical && (!form.address_line || !form.city)) return toast.error("חסרים פרטי משלוח");
    if (items.length === 0) return toast.error("העגלה ריקה");

    setSubmitting(true);
    try {
      const order_number = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderErr } = await supabase
        .from("shop_orders")
        .insert({
          order_number,
          customer_id: user?.id ?? null,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          subtotal,
          shipping_amount: shipping,
          total_amount: total,
          shipping_address: hasPhysical ? {
            address_line: form.address_line,
            city: form.city,
            postal_code: form.postal_code,
          } : null,
          notes: form.notes || null,
          status: "pending",
          payment_status: "pending",
        })
        .select("id, order_number")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Order failed");

      const orderItems = items.map((it) => ({
        order_id: order.id,
        product_id: it.id,
        product_title: it.title,
        product_type: it.product_type as any,
        quantity: it.qty,
        unit_price: it.price,
        total_price: it.price * it.qty,
      }));
      const { error: itemsErr } = await supabase.from("shop_order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clear();
      toast.success("ההזמנה נקלטה!");
      navigate({ to: "/shop/order/$orderId", params: { orderId: order.id } });
    } catch (e: any) {
      toast.error(e.message ?? "שגיאה ביצירת הזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">העגלה ריקה</h1>
          <p className="mt-2 text-muted-foreground">הוסף מוצרים לפני המעבר לתשלום</p>
          <Link to="/shop"><Button className="mt-4">לחנות</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 md:px-8" dir="rtl">
        <Link to="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> המשך קניות
        </Link>
        <h1 className="mb-6 text-3xl font-bold">תשלום</h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">פרטי לקוח</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>שם מלא *</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון *</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>אימייל *</Label>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
              </div>
            </div>

            {hasPhysical && (
              <>
                <h2 className="mb-4 mt-6 text-lg font-bold">כתובת למשלוח</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>כתובת *</Label>
                    <Input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} placeholder="רחוב ומספר בית" />
                  </div>
                  <div>
                    <Label>עיר *</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>מיקוד</Label>
                    <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            <div className="mt-6">
              <Label>הערות להזמנה (אופציונלי)</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              💳 שלב התשלום יחובר בקרוב. בינתיים — סיום ההזמנה ייצור הזמנה במצב "ממתין לתשלום" וצוות החנות ייצור איתך קשר.
            </div>
          </Card>

          <Card className="h-fit p-5 lg:sticky lg:top-20">
            <h2 className="mb-4 text-lg font-bold">סיכום הזמנה</h2>
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.id} className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.image && <img src={it.image} alt={it.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{it.title}</p>
                    <p className="text-xs text-muted-foreground">כמות: {it.qty}</p>
                  </div>
                  <div className="text-sm font-bold">{formatILS(it.price * it.qty)}</div>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><span>סכום ביניים</span><span>{formatILS(subtotal)}</span></div>
              <div className="flex justify-between">
                <span>משלוח</span>
                <span>{shipping === 0 ? <span className="text-emerald-600 font-semibold">חינם</span> : formatILS(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-bold">סה"כ לתשלום</span>
                <span className="font-bold text-primary">{formatILS(total)}</span>
              </div>
            </div>

            <Button onClick={submit} disabled={submitting} className="mt-4 w-full" size="lg">
              {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              סיום הזמנה
            </Button>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
