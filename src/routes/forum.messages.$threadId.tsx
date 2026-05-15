import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { getDmThread, sendDm } from "@/lib/forum/dm.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/messages/$threadId")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const fetchT = useServerFn(getDmThread);
  const send = useServerFn(sendDm);
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const { data, isLoading } = useQuery({ queryKey: ["forum", "dm", threadId], queryFn: () => fetchT({ data: { threadId } }) });

  useEffect(() => {
    const ch = supabase.channel(`forum-dm-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_direct_messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["forum", "dm", threadId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc]);

  const submit = async () => {
    if (body.trim().length < 1) return;
    try {
      await send({ data: { threadId, body } });
      setBody("");
      qc.invalidateQueries({ queryKey: ["forum", "dm", threadId] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/forum/messages" className="text-sm text-muted-foreground hover:underline">← הודעות</Link>
        <h1 className="text-xl font-bold my-3">{data?.other?.display_name ?? "טוען…"}</h1>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3 min-h-[300px] mb-4">
          {isLoading && <p className="text-muted-foreground">טוען…</p>}
          {data?.messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`rounded-lg px-3 py-2 max-w-[75%] ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  <div className={`text-xs mt-1 opacity-70`}>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: he })}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="כתוב הודעה…" maxLength={4000} />
          <Button onClick={submit}>שלח</Button>
        </div>
      </div>
    </SiteLayout>
  );
}
