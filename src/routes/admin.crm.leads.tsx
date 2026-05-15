import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeadCreateDialog } from "@/components/admin/LeadCreateDialog";
import { LeadStatusSelect } from "@/components/admin/_legacy/parts";
import type { Lead } from "@/components/admin/_legacy/types";

export const Route = createFileRoute("/admin/crm/leads")({
  component: LeadsRoute,
});

function LeadsRoute() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    staleTime: 30_000,
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin", "leads"] });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>לידים ({leads.length})</CardTitle>
        <LeadCreateDialog onSaved={refetch} />
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
                <TableHead>מקור</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תאריך</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.email || "—"}</TableCell>
                  <TableCell>{l.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                  <TableCell><LeadStatusSelect lead={l} onChanged={refetch} /></TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleDateString("he-IL")}</TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">אין לידים להצגה</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
