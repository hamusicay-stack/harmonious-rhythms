import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { listForumNotifications, markNotificationsRead } from "@/lib/forum/notifications.functions";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export const Route = createFileRoute("/forum/notifications")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const fetchN = useServerFn(listForumNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["forum", "notifications"], queryFn: () => fetchN({ data: { limit: 50 } }) });

  useEffect(() => {
    const ch = supabase.channel("forum-notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_notifications" },
        () => qc.invalidateQueries({ queryKey: ["forum", "notifications"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <header className="flex items-center justify-between my-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />התראות</h1>
          <Button variant="outline" size="sm" onClick={async () => { await markRead({ data: { all: true } }); qc.invalidateQueries({ queryKey: ["forum", "notifications"] }); }}>
            <Check className="h-4 w-4 ml-1" />סמן הכל כנקרא
          </Button>
        </header>

        {isLoading && <p className="text-muted-foreground">טוען…</p>}
        <div className="space-y-2">
          {data?.notifications.map((n) => (
            <a
              key={n.id}
              href={n.link || "/forum"}
              onClick={async (e) => { await markRead({ data: { ids: [n.id] } }); qc.invalidateQueries({ queryKey: ["forum", "notifications"] }); }}
              className={`block rounded border border-border p-3 hover:bg-accent/40 ${!n.read_at ? "bg-accent/20" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: he })}
                </div>
              </div>
            </a>
          ))}
          {data?.notifications.length === 0 && <p className="text-center py-8 text-muted-foreground">אין התראות</p>}
        </div>
      </div>
    </SiteLayout>
  );
}
