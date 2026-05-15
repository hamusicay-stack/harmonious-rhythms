import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { StatCard } from "@/components/admin/_legacy/parts";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [profilesRes, leadsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("user_type"),
        supabase.from("leads").select("status"),
        supabase.from("orders").select("amount").eq("payment_status", "paid").gte("created_at", monthStart.toISOString()),
      ]);
      const activeCustomers = (profilesRes.data ?? []).filter((x) => x.user_type === "customer").length;
      const newLeads = (leadsRes.data ?? []).filter((x) => x.status === "new").length;
      const monthlySales = (ordersRes.data ?? []).reduce((sum, o: { amount: number }) => sum + Number(o.amount || 0), 0);
      return { activeCustomers, newLeads, monthlySales };
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">דשבורד</h1>
        <p className="mt-2 text-sm text-muted-foreground">סקירה מהירה של הקהילה והמכירות.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="לקוחות פעילים" value={stats?.activeCustomers ?? 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="מכירות החודש" value={`₪${(stats?.monthlySales ?? 0).toLocaleString()}`} />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="לידים חדשים" value={stats?.newLeads ?? 0} highlight={(stats?.newLeads ?? 0) > 0} />
      </div>
      <DashboardOverview />
    </div>
  );
}
