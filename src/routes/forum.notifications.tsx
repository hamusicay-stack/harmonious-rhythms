import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
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
  const { items, loading, markRead, markAllRead } = useNotifications();
  const forumItems = items.filter((n) => n.type?.startsWith("forum_"));

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <header className="flex items-center justify-between my-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />התראות פורום</h1>
          <Button variant="outline" size="sm" onClick={() => markAllRead()}>
            <Check className="h-4 w-4 ml-1" />סמן הכל כנקרא
          </Button>
        </header>
        <p className="text-xs text-muted-foreground mb-3">כל התראות הפורום מסונכרנות עם פעמון ההתראות הראשי באתר.</p>

        {loading && <p className="text-muted-foreground">טוען…</p>}
        <div className="space-y-2">
          {forumItems.map((n) => (
            <a
              key={n.id}
              href={n.link || "/forum"}
              onClick={() => markRead(n.id)}
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
          {!loading && forumItems.length === 0 && <p className="text-center py-8 text-muted-foreground">אין התראות פורום עדיין</p>}
        </div>
      </div>
    </SiteLayout>
  );
}
