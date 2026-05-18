import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { listReports, updateReportStatus } from "@/lib/forum/moderation.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/moderation")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: ModerationPage,
});

function ModerationPage() {
  const fetchR = useServerFn(listReports);
  const update = useServerFn(updateReportStatus);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "reviewed" | "dismissed">("open");
  const { data, isLoading, error } = useQuery({
    queryKey: ["forum", "reports", status],
    queryFn: () => fetchR({ data: { status } }),
    retry: false,
  });

  const act = async (id: string, s: "reviewed" | "dismissed") => {
    try {
      await update({ data: { reportId: id, status: s } });
      qc.invalidateQueries({ queryKey: ["forum", "reports"] });
      toast.success("עודכן");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <h1 className="text-2xl font-bold my-4 flex items-center gap-2"><Shield className="h-6 w-6" />ניהול ודיווחים</h1>

        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="open">פתוחים</TabsTrigger>
            <TabsTrigger value="reviewed">טופלו</TabsTrigger>
            <TabsTrigger value="dismissed">נדחו</TabsTrigger>
          </TabsList>
        </Tabs>

        {error && <p className="text-destructive mt-4">{(error as Error).message}</p>}
        {isLoading && <p className="text-muted-foreground mt-4">טוען…</p>}

        <div className="space-y-2 mt-4">
          {data?.reports.map((r) => (
            <div key={r.id} className="rounded border border-border bg-card p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="text-sm">
                    <span className="font-medium">{r.target_type}</span> · {r.target_id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.reason}</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: he })}</div>
                </div>
                {status === "open" && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" onClick={() => act(r.id, "reviewed")}>סמן כטופל</Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "dismissed")}>דחה</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {data?.reports.length === 0 && <p className="text-center py-8 text-muted-foreground">אין דיווחים</p>}
        </div>
      </div>
    </SiteLayout>
  );
}
