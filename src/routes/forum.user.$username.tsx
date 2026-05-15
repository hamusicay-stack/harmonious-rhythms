import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { getForumUserProfile } from "@/lib/forum/moderation.functions";
import { openOrCreateDmThread } from "@/lib/forum/dm.functions";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/user/$username")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: UserPage,
});

function UserPage() {
  const { username } = Route.useParams();
  const fetchU = useServerFn(getForumUserProfile);
  const openDm = useServerFn(openOrCreateDmThread);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["forum", "user", username], queryFn: () => fetchU({ data: { username } }) });

  const startDm = async () => {
    if (!data?.profile) return;
    try {
      const r = await openDm({ data: { otherUserId: data.profile.id } });
      navigate({ to: "/forum/messages/$threadId", params: { threadId: r.threadId } });
    } catch (e) { toast.error((e as Error).message); }
  };

  if (isLoading) return <SiteLayout><div className="p-8" dir="rtl">טוען…</div></SiteLayout>;
  if (!data?.profile) return <SiteLayout><div className="p-8" dir="rtl">המשתמש לא נמצא</div></SiteLayout>;

  const p = data.profile;
  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <div className="flex items-center gap-4 my-6">
          {p.avatar_url && <img src={p.avatar_url} className="h-20 w-20 rounded-full" alt="" />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{p.display_name ?? p.username}</h1>
            <p className="text-sm text-muted-foreground">@{p.username}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {p.forum_rank} · {p.forum_post_count} הודעות · {p.forum_reputation} מוניטין · הצטרף {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: he })}
            </p>
          </div>
          <Button onClick={startDm}><MessageCircle className="h-4 w-4 ml-1" />הודעה</Button>
        </div>

        {p.forum_signature && (
          <div className="rounded border border-border p-3 mb-6 text-sm italic text-muted-foreground whitespace-pre-wrap">
            {p.forum_signature}
          </div>
        )}

        <section className="mb-6">
          <h2 className="font-semibold mb-2">אשכולות אחרונים</h2>
          <div className="space-y-1">
            {data.recentTopics.map((t) => (
              <Link key={t.id} to="/forum/topic/$slug" params={{ slug: t.slug }} className="block px-3 py-2 rounded hover:bg-accent/40">
                <span className="text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground mr-2">· {t.reply_count} תגובות</span>
              </Link>
            ))}
            {data.recentTopics.length === 0 && <p className="text-sm text-muted-foreground">אין אשכולות</p>}
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-2">תגובות אחרונות</h2>
          <div className="space-y-2">
            {data.recentPosts.map((p2) => (
              <Link key={p2.id} to="/forum/topic/$slug" params={{ slug: p2.topic?.slug ?? "" }} className="block rounded border border-border p-3 hover:bg-accent/40">
                <div className="text-sm font-medium">{p2.topic?.title ?? "אשכול"}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p2.body_md}</div>
              </Link>
            ))}
            {data.recentPosts.length === 0 && <p className="text-sm text-muted-foreground">אין תגובות</p>}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
