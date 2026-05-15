import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CustomerEditDialog,
} from "@/components/admin/_legacy/parts";
import { ORGAN_MODELS, type Customer } from "@/components/admin/_legacy/types";

export const Route = createFileRoute("/admin/crm/customers")({
  component: CustomersRoute,
});

function CustomersRoute() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [organFilter, setOrganFilter] = useState<string>("all");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
    staleTime: 30_000,
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["admin", "customers"] });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (organFilter !== "all" && c.organ_model !== organFilter) return false;
      if (!q) return true;
      return [c.display_name, c.full_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [customers, search, organFilter]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>לקוחות ({filtered.length})</CardTitle>
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <Input placeholder="חיפוש..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={organFilter} onValueChange={setOrganFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="דגם אורגן" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הדגמים</SelectItem>
              {ORGAN_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>אורגן</TableHead>
                <TableHead>מנוי</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.display_name || c.full_name || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.user_type}</Badge></TableCell>
                  <TableCell>{c.organ_model || "—"}</TableCell>
                  <TableCell><Badge>{c.subscription_tier}</Badge></TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/customers/$customerId" params={{ customerId: c.id }}>
                          <Eye className="ml-1 h-4 w-4" />כרטיס 360°
                        </Link>
                      </Button>
                      <CustomerEditDialog customer={c} onSaved={refetch} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">אין לקוחות להצגה</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
