import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SupplierEditDialog } from "@/components/admin/_legacy/parts";
import type { Supplier } from "@/components/admin/_legacy/types";

export const Route = createFileRoute("/admin/crm/suppliers")({
  component: SuppliersRoute,
});

function SuppliersRoute() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["admin", "suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
    staleTime: 30_000,
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin", "suppliers"] });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.company_name, s.contact_name, s.email, s.phone].some((v) => v?.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>ספקים ({filtered.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <SupplierEditDialog onSaved={refetch} />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>חברה</TableHead>
                <TableHead>איש קשר</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.company_name}</TableCell>
                  <TableCell>{s.contact_name || "—"}</TableCell>
                  <TableCell>{s.email || "—"}</TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                  <TableCell>{s.is_active ? <Badge>פעיל</Badge> : <Badge variant="secondary">לא פעיל</Badge>}</TableCell>
                  <TableCell className="text-end"><SupplierEditDialog supplier={s} onSaved={refetch} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">אין ספקים להצגה</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
