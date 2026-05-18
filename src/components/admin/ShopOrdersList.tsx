import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתינה", paid: "שולמה", processing: "בעיבוד", shipped: "נשלחה",
  completed: "הושלמה", cancelled: "בוטלה", refunded: "הוחזרה",
};

export function ShopOrdersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shop_orders")
      .select("id, order_number, status, payment_status, total_amount, currency, customer_name, customer_email, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.order_number.toLowerCase().includes(s) ||
      (r.customer_name ?? "").toLowerCase().includes(s) ||
      (r.customer_email ?? "").toLowerCase().includes(s);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>הזמנות חנות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי מספר הזמנה / לקוח / מייל" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין הזמנות</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מס׳</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>תשלום</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order_number}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.customer_name ?? "—"}</div>
                      <div className="text-muted-foreground">{r.customer_email ?? "—"}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                    <TableCell><Badge variant={r.payment_status === "paid" ? "default" : r.payment_status === "refunded" ? "destructive" : "secondary"}>{r.payment_status}</Badge></TableCell>
                    <TableCell>{r.currency} {Number(r.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/commerce/orders/$orderId" params={{ orderId: r.id }}>
                          פרטים <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
