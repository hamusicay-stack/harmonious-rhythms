import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/routeGuards";

export const Route = createFileRoute("/admin/audit-log")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "יומן ביקורת — המוזיקאי" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AuditLogPage,
});

type Row = {
  id: string;
  user_id: string | null;
  user_type: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("system_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return (
      r.action.toLowerCase().includes(f) ||
      (r.entity ?? "").toLowerCase().includes(f) ||
      (r.entity_id ?? "").toLowerCase().includes(f)
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />יומן ביקורת מערכת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="חיפוש לפי פעולה / ישות / מזהה..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />
          <div className="text-xs text-muted-foreground">{loading ? "טוען..." : `${filtered.length} רשומות`}</div>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-end">תאריך</TableHead>
                  <TableHead className="text-end">פעולה</TableHead>
                  <TableHead className="text-end">ישות</TableHead>
                  <TableHead className="text-end">מזהה</TableHead>
                  <TableHead className="text-end">משתמש</TableHead>
                  <TableHead className="text-end">פרטים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    אין רשומות
                  </TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("he-IL")}</TableCell>
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell className="text-sm">{r.entity ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.entity_id ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.user_type ?? "—"}</TableCell>
                    <TableCell>
                      <pre className="text-[10px] text-muted-foreground max-w-xs overflow-x-auto">{JSON.stringify(r.details ?? {}, null, 0)}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
