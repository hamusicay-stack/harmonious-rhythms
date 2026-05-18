import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Loader2, ExternalLink, RotateCcw, Package } from "lucide-react";

type OrderItem = {
  id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fulfillment_kind: string | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  shop_order_items: OrderItem[];
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "ממתין", variant: "secondary" },
  processing: { label: "בעיבוד", variant: "secondary" },
  paid: { label: "שולם", variant: "default" },
  completed: { label: "הושלם", variant: "default" },
  shipped: { label: "נשלח", variant: "default" },
  cancelled: { label: "בוטל", variant: "destructive" },
  refunded: { label: "הוחזר", variant: "outline" },
  failed: { label: "נכשל", variant: "destructive" },
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}

export function MyOrdersTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("shop_orders")
        .select("*, shop_order_items(*)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      if (!alive) return;
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <ShoppingBag className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-2xl font-bold">לא ביצעת הזמנות עדיין</h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            כל ההזמנות שלך מהחנות יופיעו כאן. גלה מוצרים, ציוד וקבצים דיגיטליים.
          </p>
          <Button asChild size="lg">
            <Link to="/shop">לחנות</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const s = STATUS_LABELS[o.status] ?? { label: o.status, variant: "outline" as const };
        const p = STATUS_LABELS[o.payment_status] ?? { label: o.payment_status, variant: "outline" as const };
        const items = o.shop_order_items ?? [];
        return (
          <Card
            key={o.id}
            className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-background via-background to-amber-500/5 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10"
          >
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-500" />
                    <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
                      #{o.order_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-xl font-bold text-primary">₪{Number(o.total_amount).toFixed(2)}</div>
                  <div className="flex gap-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Badge variant={p.variant}>{p.label}</Badge>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    פריטים ({items.length})
                  </p>
                  <ul className="space-y-1">
                    {items.slice(0, 4).map((it) => (
                      <li key={it.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          <span className="text-muted-foreground">·</span> {it.product_title}
                          {it.quantity > 1 && (
                            <span className="text-xs text-muted-foreground"> ×{it.quantity}</span>
                          )}
                        </span>
                      </li>
                    ))}
                    {items.length > 4 && (
                      <li className="text-xs text-muted-foreground">+{items.length - 4} פריטים נוספים</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="default">
                  <Link to="/shop/order/$orderId" params={{ orderId: o.id }}>
                    <ExternalLink className="ms-1 h-4 w-4" />
                    צפה בקבלה
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast("Reorder functionality coming soon")}
                >
                  <RotateCcw className="ms-1 h-4 w-4" />
                  הזמן שוב
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
