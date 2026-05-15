import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTopicBySlug } from "@/lib/forum/topics.functions";
import { createReply, votePost, getMyVotesForTopic, deletePost, editPost, reportContent } from "@/lib/forum/posts.functions";
import { openOrCreateDmThread } from "@/lib/forum/dm.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUp, ArrowDown, Quote, Flag, Pencil, Trash2, MessageCircle, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/forum/topic/$slug")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: TopicPage,
});

function TopicPage() {
  const { slug } = Route.useParams();
  const fetchTopic = useServerFn(getTopicBySlug);
  const fetchVotes = useServerFn(getMyVotesForTopic);
  const reply = useServerFn(createReply);
  const vote = useServerFn(votePost);
  const del = useServerFn(deletePost);
  const edit = useServerFn(editPost);
  const report = useServerFn(reportContent);
  const openDm = useServerFn(openOrCreateDmThread);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [quoted, setQuoted] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const topic = useQuery({ queryKey: ["forum", "topic", slug], queryFn: () => fetchTopic({ data: { slug } }) });
  const topicId = topic.data?.topic?.id;
  const votes = useQuery({
    queryKey: ["forum", "votes", topicId],
    queryFn: () => fetchVotes({ data: { topicId: topicId! } }),
    enabled: !!topicId,
  });

  // Realtime: refresh on new posts
  useEffect(() => {
    if (!topicId) return;
    const ch = supabase.channel(`forum-topic-${topicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts", filter: `topic_id=eq.${topicId}` },
        () => qc.invalidateQueries({ queryKey: ["forum", "topic", slug] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [topicId, slug, qc]);

  const submitReply = async () => {
    if (body.trim().length < 1) return;
    try {
      await reply({ data: { topicId: topicId!, body, quotedPostId: quoted ?? undefined } });
      setBody(""); setQuoted(null);
      qc.invalidateQueries({ queryKey: ["forum", "topic", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const doVote = async (postId: string, value: -1 | 0 | 1) => {
    try {
      await vote({ data: { postId, value } });
      qc.invalidateQueries({ queryKey: ["forum", "votes", topicId] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await edit({ data: { postId: editing, body: editBody } });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["forum", "topic", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const submitReport = async () => {
    if (!reportFor || reportReason.trim().length < 3) return;
    try {
      await report({ data: { targetType: "post", targetId: reportFor, reason: reportReason } });
      toast.success("הדיווח נשלח");
      setReportFor(null); setReportReason("");
    } catch (e) { toast.error((e as Error).message); }
  };

  const startDm = async (otherId: string) => {
    try {
      const r = await openDm({ data: { otherUserId: otherId } });
      navigate({ to: "/forum/messages/$threadId", params: { threadId: r.threadId } });
    } catch (e) { toast.error((e as Error).message); }
  };

  if (topic.isLoading) return <SiteLayout><div className="p-8" dir="rtl">טוען…</div></SiteLayout>;
  if (!topic.data?.topic) return <SiteLayout><div className="p-8" dir="rtl">האשכול לא נמצא</div></SiteLayout>;

  const t = topic.data.topic;
  const board = topic.data.board;
  const posts = topic.data.posts;
  const authors = topic.data.authors;

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        {board && (
          <>
            {" / "}
            <Link to="/forum/board/$slug" params={{ slug: board.slug }} className="text-sm text-muted-foreground hover:underline">{board.name}</Link>
          </>
        )}
        <h1 className="text-2xl font-bold mt-3 mb-1 flex items-center gap-2">
          {t.is_locked && <Lock className="h-5 w-5 text-muted-foreground" />}
          {t.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-6">{posts.length} הודעות · {t.view_count} צפיות</p>

        <div className="space-y-4">
          {posts.map((p) => {
            const a = authors[p.author_id];
            const score = votes.data?.scores?.[p.id] ?? 0;
            const myVote = votes.data?.votes?.[p.id] ?? 0;
            const isMine = me === p.author_id;
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {a?.avatar_url && <img src={a.avatar_url} alt="" className="h-8 w-8 rounded-full" />}
                    <div>
                      {a?.username ? (
                        <Link to="/forum/user/$username" params={{ username: a.username }} className="font-medium hover:underline">
                          {a.display_name ?? a.username}
                        </Link>
                      ) : <span className="font-medium">{a?.display_name ?? "משתמש"}</span>}
                      <div className="text-xs text-muted-foreground">
                        {a?.forum_rank} · {a?.forum_post_count ?? 0} הודעות · {a?.forum_reputation ?? 0} מוניטין
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: he })}
                    {p.edited_at && " · עודכן"}
                  </div>
                </div>

                {p.is_deleted ? (
                  <p className="text-muted-foreground italic">[הודעה נמחקה]</p>
                ) : editing === p.id ? (
                  <div className="space-y-2">
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={submitEdit}>שמור</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>בטל</Button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{p.body_md}</div>
                )}

                {a?.forum_signature && !p.is_deleted && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground italic whitespace-pre-wrap">
                    {a.forum_signature}
                  </div>
                )}

                {!p.is_deleted && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border flex-wrap">
                    <Button size="sm" variant={myVote === 1 ? "default" : "ghost"} onClick={() => doVote(p.id, myVote === 1 ? 0 : 1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{score}</span>
                    <Button size="sm" variant={myVote === -1 ? "default" : "ghost"} onClick={() => doVote(p.id, myVote === -1 ? 0 : -1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {!t.is_locked && (
                      <Button size="sm" variant="ghost" onClick={() => { setQuoted(p.id); setBody(`> ${p.body_md.slice(0, 200)}\n\n`); }}>
                        <Quote className="h-4 w-4 ml-1" />ציטוט
                      </Button>
                    )}
                    {!isMine && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startDm(p.author_id)}>
                          <MessageCircle className="h-4 w-4 ml-1" />הודעה פרטית
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReportFor(p.id)}>
                          <Flag className="h-4 w-4 ml-1" />דווח
                        </Button>
                      </>
                    )}
                    {isMine && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p.id); setEditBody(p.body_md); }}>
                          <Pencil className="h-4 w-4 ml-1" />ערוך
                        </Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (confirm("למחוק?")) { await del({ data: { postId: p.id } }); qc.invalidateQueries({ queryKey: ["forum", "topic", slug] }); }
                        }}>
                          <Trash2 className="h-4 w-4 ml-1" />מחק
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!t.is_locked && (
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-2">הוסף תגובה</h3>
            {quoted && (
              <div className="text-xs text-muted-foreground mb-2">
                מצטט הודעה · <button className="underline" onClick={() => setQuoted(null)}>בטל</button>
              </div>
            )}
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="כתוב תגובה (Markdown נתמך)" maxLength={20000} />
            <div className="mt-2 flex justify-end">
              <Button onClick={submitReply} disabled={body.trim().length === 0}>פרסם</Button>
            </div>
          </div>
        )}

        <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>דיווח על הודעה</DialogTitle></DialogHeader>
            <Textarea placeholder="סיבת הדיווח" value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={4} />
            <DialogFooter><Button onClick={submitReport}>שלח דיווח</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}
