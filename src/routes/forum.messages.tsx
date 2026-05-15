import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { listDmThreads } from "@/lib/forum/dm.functions";
import { Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export const Route = createFileRoute("/forum/messages")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: MessagesPage,
});

function MessagesPage() {
  const fetchT = useServerFn(listDmThreads);
  const { data, isLoading } = useQuery({ queryKey: ["forum", "dm", "threads"], queryFn: () => fetchT() });

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <h1 className="text-2xl font-bold my-4 flex items-center gap-2"><Mail className="h-6 w-6" />הודעות פרטיות</h1>

        {isLoading && <p className="text-muted-foreground">טוען…</p>}
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {data?.threads.length === 0 && <div className="p-6 text-center text-muted-foreground">אין הודעות עדיין</div>}
          {data?.threads.map((t) => (
            <Link key={t.id} to="/forum/messages/$threadId" params={{ threadId: t.id }} className="block px-4 py-3 hover:bg-accent/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {t.other?.avatar_url && <img src={t.other.avatar_url} className="h-10 w-10 rounded-full" alt="" />}
                  <div className="min-w-0">
                    <div className="font-medium">{t.other?.display_name ?? "משתמש"}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.last_message_preview ?? "—"}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-left shrink-0">
                  {t.unread > 0 && <span className="inline-block bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs mb-1">{t.unread}</span>}
                  <div>{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true, locale: he })}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
