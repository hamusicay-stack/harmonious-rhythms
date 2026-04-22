import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Package, Mail, Phone, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatILS, ORDER_STATUS_LABEL } from "@/lib/shopUtils";

export const Route = createFileRoute("/shop/order/$orderId")({
  head: () => ({
    meta: [
      { title: "אישור הזמנה — חנות המוזיקאי" },
      { name: "description", content: "פרטי ההזמנה שלך" },
    ],
  }),
  component: OrderConfirmationPage,
});

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number;
  shipping_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  shipping_address: any;
  notes: string | null;
  created_at: string;
};
type OrderItem = {
  id: string;
  product_title: string;
  product_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

function OrderConfirmationPage() {
  const { orderId } = useParams({ from: "/shop/order/$orderId" });
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: o } = await supabase.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
      const { data: its } = await supabase.from("shop_order_items").select("*").eq("order_id", orderId);
      setOrder(o as Order | null);
      setItems((its as OrderItem[]) ?? []);
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto flex items-center justify-center py-24" dir="rtl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <h1 className="text-2xl font-bold">ההזמנה לא נמצאה</h1>
          <Link to="/shop"><Button className="mt-4">חזרה לחנות</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  const addr = order.shipping_address as { address_line?: string; city?: string; postal_code?: string } | null;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10" dir="rtl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold">תודה על ההזמנה!</h1>
          <p className="mt-2 text-muted-foreground">קיבלנו את ההזמנה שלך. נשלח אליך אישור באימייל.</p>
          <p className="mt-3 text-sm">מספר הזמנה: <span className="font-mono font-bold">{order.order_number}</span></p>
        </div>

        <Card className="mb-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Package className="h-5 w-5 text-primary" /> פריטים</h2>
            <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
          </div>
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{it.product_title}</p>
                  <p className="text-xs text-muted-foreground">כמות: {it.quantity} · מחיר ליחידה {formatILS(it.unit_price)}</p>
                </div>
                <div className="font-bold">{formatILS(it.total_price)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between"><span>סכום ביניים</span><span>{formatILS(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>משלוח</span><span>{order.shipping_amount === 0 ? "חינם" : formatILS(order.shipping_amount)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>סה"כ</span><span className="text-primary">{formatILS(order.total_amount)}</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 font-bold">פרטי לקוח</h3>
            <div className="space-y-2 text-sm">
              <div>{order.customer_name}</div>
              {order.customer_email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" />{order.customer_email}</div>}
              {order.customer_phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{order.customer_phone}</div>}
            </div>
          </Card>
          {addr?.address_line && (
            <Card className="p-5">
              <h3 className="mb-3 font-bold">כתובת למשלוח</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>{addr.address_line}</div>
                <div>{addr.city}{addr.postal_code ? ` · ${addr.postal_code}` : ""}</div>
              </div>
            </Card>
          )}
        </div>

        {order.notes && (
          <Card className="mt-4 p-5">
            <h3 className="mb-2 font-bold">הערות</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </Card>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link to="/shop"><Button variant="outline">המשך קניות</Button></Link>
          <Link to="/profile"><Button>לפרופיל שלי</Button></Link>
        </div>
      </div>
    </SiteLayout>
  );
}
