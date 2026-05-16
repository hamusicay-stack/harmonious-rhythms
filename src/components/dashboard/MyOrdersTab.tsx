import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingBag, Loader2, ExternalLink } from "lucide-react";

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
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
    return new Date(s).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
        .select(
          "id, order_number, status, payment_status, total_amount, currency, created_at",
        )
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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מספר הזמנה</TableHead>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">סכום</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">תשלום</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const s = STATUS_LABELS[o.status] ?? {
                label: o.status,
                variant: "outline" as const,
              };
              const p = STATUS_LABELS[o.payment_status] ?? {
                label: o.payment_status,
                variant: "outline" as const,
              };
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">
                    #{o.order_number}
                  </TableCell>
                  <TableCell>{fmtDate(o.created_at)}</TableCell>
                  <TableCell className="font-semibold">
                    ₪{Number(o.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.variant}>{p.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        to="/shop/order/$orderId"
                        params={{ orderId: o.id }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
