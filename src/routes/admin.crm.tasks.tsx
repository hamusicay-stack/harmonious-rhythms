import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TaskEditDialog, TaskRow } from "@/components/admin/_legacy/parts";
import type { Customer, Task } from "@/components/admin/_legacy/types";

export const Route = createFileRoute("/admin/crm/tasks")({
  component: TasksRoute,
});

function TasksRoute() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin", "tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 30_000,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
    staleTime: 30_000,
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin", "tasks"] });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>משימות ({tasks.length})</CardTitle>
        <TaskEditDialog customers={customers} onSaved={refetch} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => <TaskRow key={t.id} task={t} customers={customers} onChanged={refetch} />)}
            {tasks.length === 0 && <p className="py-8 text-center text-muted-foreground">אין משימות פעילות</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
