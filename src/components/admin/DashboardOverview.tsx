import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Clock, Package, TrendingUp, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

type RevenuePoint = { month: string; total: number; [productKey: string]: number | string };

type UrgentLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type IncomingOrder = {
  id: string;
  order_number: string | null;
  total_amount: number;
  expected_delivery_date: string;
  supplier_id: string;
  supplier_name?: string;
};

const monthLabel = (d: Date) => d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" });

export function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [urgentLeads, setUrgentLeads] = useState<UrgentLead[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);

  useEffect(() => { (async () => {
    setLoading(true);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [ordersRes, leadsRes, supOrdersRes, suppliersRes] = await Promise.all([
      supabase
        .from("orders")
        .select("amount, product_name, created_at, payment_status")
        .eq("payment_status", "paid")
        .gte("created_at", sixMonthsAgo.toISOString()),
      supabase
        .from("leads")
        .select("id, name, phone, email, created_at")
        .eq("status", "new")
        .lt("created_at", yesterday.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("supplier_orders")
        .select("id, order_number, total_amount, expected_delivery_date, supplier_id")
        .gte("expected_delivery_date", todayStart.toISOString())
        .lte("expected_delivery_date", todayEnd.toISOString())
        .neq("status", "received")
        .neq("status", "cancelled"),
      supabase.from("suppliers").select("id, company_name"),
    ]);

    // Build revenue data
    const buckets: Record<string, RevenuePoint> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      d.setDate(1); d.setHours(0, 0, 0, 0);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets[key] = { month: monthLabel(d), total: 0 };
    }
    const allProducts = new Set<string>();
    (ordersRes.data ?? []).forEach((o: any) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) return;
      const product = (o.product_name || "אחר").trim();
      const amount = Number(o.amount || 0);
      buckets[key][product] = (Number(buckets[key][product]) || 0) + amount;
      buckets[key].total = (Number(buckets[key].total) || 0) + amount;
      allProducts.add(product);
    });
    setRevenue(Object.values(buckets));
    setProductKeys(Array.from(allProducts).slice(0, 5));

    setUrgentLeads((leadsRes.data ?? []) as UrgentLead[]);

    const supplierMap = new Map<string, string>();
    (suppliersRes.data ?? []).forEach((s: any) => supplierMap.set(s.id, s.company_name));
    const orders = ((supOrdersRes.data ?? []) as any[]).map((o) => ({
      ...o,
      supplier_name: supplierMap.get(o.supplier_id) ?? "—",
    }));
    setIncomingOrders(orders as IncomingOrder[]);

    setLoading(false);
  })(); }, []);

  const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "#a78bfa", "#f59e0b", "#10b981"];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts row */}
      {(urgentLeads.length > 0 || incomingOrders.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {urgentLeads.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  לידים שלא חזרו אליהם ({urgentLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {urgentLeads.slice(0, 5).map((l) => {
                  const hours = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 3600000);
                  return (
                    <div key={l.id} className="flex items-center justify-between rounded-md border bg-card p-2 text-sm">
                      <div>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">לפני {hours} שעות</div>
                      </div>
                      <div className="flex gap-1">
                        {l.phone && (
                          <Button asChild size="icon" variant="ghost">
                            <a href={`tel:${l.phone}`}><Phone className="h-4 w-4" /></a>
                          </Button>
                        )}
                        {l.email && (
                          <Button asChild size="icon" variant="ghost">
                            <a href={`mailto:${l.email}`}><Mail className="h-4 w-4" /></a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {urgentLeads.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">ועוד {urgentLeads.length - 5}...</p>
                )}
              </CardContent>
            </Card>
          )}
          {incomingOrders.length > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5 text-primary" />
                  הזמנות מספקים שצריכות להגיע היום ({incomingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {incomingOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border bg-card p-2 text-sm">
                    <div>
                      <div className="font-medium">{o.supplier_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.order_number ?? "ללא מס׳"} · ₪{Number(o.total_amount).toLocaleString()}
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            הכנסות 6 חודשים אחרונים — לפי מוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productKeys.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">אין נתוני מכירות עדיין.</p>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₪${v}`} />
                  <Tooltip
                    formatter={(v: number) => `₪${v.toLocaleString()}`}
                    contentStyle={{ direction: "rtl", borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {productKeys.map((p, i) => (
                    <Bar key={p} dataKey={p} stackId="a" fill={colors[i % colors.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
