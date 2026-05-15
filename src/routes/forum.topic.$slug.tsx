import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTopicBySlug, getTopicMeta, markTopicSolution, setSubscription, isSubscribed } from "@/lib/forum/topics.functions";
import { createReply, votePost, getMyVotesForTopic, deletePost, editPost, reportContent } from "@/lib/forum/posts.functions";
import { openOrCreateDmThread } from "@/lib/forum/dm.functions";
import { ForumEditor } from "@/components/forum/ForumEditor";
import { sanitizeForumHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowUp, ArrowDown, Quote, Flag, Pencil, Trash2, MessageCircle, Lock, CheckCircle2, Bell, BellOff, Crown, CornerDownRight, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/topic/$slug")({
  loader: async ({ params }) => {
    try {
      const meta = await getTopicMeta({ data: { slug: params.slug } });
      return { meta };
    } catch {
      return { meta: { title: null, excerpt: null, board: null } };
    }
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const title = m?.title ? `${m.title} — פורום המוזיקאי` : "פורום המוזיקאי";
    const desc = m?.excerpt || "דיון בקהילת המוזיקאים של הפורום של המוזיקאי.";
    const url = `https://harmonious-rhythms.lovable.app/forum/topic/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: TopicPage,
});

const TIER_LABELS: Record<string, string> = {
  free: "", basic: "Basic", pro: "Pro", premium: "Premium", vip: "VIP", platinum: "Platinum",
};

function VipBadge({ tier }: { tier?: string | null }) {
  if (!tier || tier === "free") return null;
  const label = TIER_LABELS[tier] ?? tier;
  return (
    <Badge variant="secondary" className="gap-1 text-[10px] bg-gradient-to-r from-amber-500/20 to-amber-300/20 border-amber-400/40">
      <Crown className="h-3 w-3" />{label}
    </Badge>
  );
}

function TopicPage() {
  const { slug } = Route.useParams();
  const fetchTopic = useServerFn(getTopicBySlug);
  const fetchVotes = useServerFn(getMyVotesForTopic);
  const fetchSub = useServerFn(isSubscribed);
  const reply = useServerFn(createReply);
  const vote = useServerFn(votePost);
  const del = useServerFn(deletePost);
  const edit = useServerFn(editPost);
  const report = useServerFn(reportContent);
  const openDm = useServerFn(openOrCreateDmThread);
  const markSol = useServerFn(markTopicSolution);
  const setSub = useServerFn(setSubscription);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [quoted, setQuoted] = useState<string | null>(null);
  const [replyParent, setReplyParent] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const topic = useQuery({ queryKey: ["forum", "topic", slug], queryFn: () => fetchTopic({ data: { slug } }) });
  const topicId = topic.data?.topic?.id;
  const votes = useQuery({
    queryKey: ["forum", "votes", topicId],
    queryFn: () => fetchVotes({ data: { topicId: topicId! } }),
    enabled: !!topicId,
  });
  const sub = useQuery({
    queryKey: ["forum", "sub", topicId],
    queryFn: () => fetchSub({ data: { topicId: topicId! } }),
    enabled: !!topicId,
  });

  useEffect(() => {
    if (!topicId) return;
    const ch = supabase.channel(`forum-topic-${topicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts", filter: `topic_id=eq.${topicId}` },
        () => qc.invalidateQueries({ queryKey: ["forum", "topic", slug] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_post_votes" },
        () => qc.invalidateQueries({ queryKey: ["forum", "votes", topicId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [topicId, slug, qc]);

  const submitReply = async () => {
    const trimmed = body.replace(/<[^>]+>/g, "").trim();
    if (trimmed.length < 1) return;
    try {
      await reply({ data: { topicId: topicId!, body, quotedPostId: quoted ?? undefined, parentPostId: replyParent ?? undefined } });
      setBody(""); setQuoted(null); setReplyParent(null);
      qc.invalidateQueries({ queryKey: ["forum", "topic", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const doVote = async (postId: string, value: -1 | 0 | 1) => {
    try { await vote({ data: { postId, value } }); qc.invalidateQueries({ queryKey: ["forum", "votes", topicId] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const submitEdit = async () => {
    if (!editing) return;
    try { await edit({ data: { postId: editing, body: editBody } }); setEditing(null); qc.invalidateQueries({ queryKey: ["forum", "topic", slug] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const submitReport = async () => {
    if (!reportFor || reportReason.trim().length < 3) return;
    try { await report({ data: { targetType: "post", targetId: reportFor, reason: reportReason } }); toast.success("הדיווח נשלח"); setReportFor(null); setReportReason(""); }
    catch (e) { toast.error((e as Error).message); }
  };

  const startDm = async (otherId: string) => {
    try { const r = await openDm({ data: { otherUserId: otherId } }); navigate({ to: "/forum/messages/$threadId", params: { threadId: r.threadId } }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const toggleSolution = async (postId: string) => {
    if (!topicId) return;
    const isCurrent = topic.data?.topic?.solved_post_id === postId;
    try {
      await markSol({ data: { topicId, postId: isCurrent ? null : postId } });
      qc.invalidateQueries({ queryKey: ["forum", "topic", slug] });
      toast.success(isCurrent ? "סימון הפתרון בוטל" : "התשובה סומנה כפתרון");
    } catch (e) { toast.error((e as Error).message); }
  };

  const toggleFollow = async () => {
    if (!topicId) return;
    try {
      await setSub({ data: { topicId, subscribed: !sub.data?.subscribed } });
      qc.invalidateQueries({ queryKey: ["forum", "sub", topicId] });
    } catch (e) { toast.error((e as Error).message); }
  };

  if (topic.isLoading) return <SiteLayout><div className="p-8" dir="rtl">טוען…</div></SiteLayout>;
  if (!topic.data?.topic) return <SiteLayout><div className="p-8" dir="rtl">האשכול לא נמצא</div></SiteLayout>;

  const t = topic.data.topic;
  const board = topic.data.board;
  const posts = topic.data.posts;
  const authors = topic.data.authors;
  const isOpAuthor = me && me === t.author_id;

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-3 sm:px-4 py-6 max-w-4xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        {board && (<>{" / "}<Link to="/forum/board/$slug" params={{ slug: board.slug }} className="text-sm text-muted-foreground hover:underline">{board.name}</Link></>)}
        <div className="mt-3 mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            {t.is_locked && <Lock className="h-5 w-5 text-muted-foreground" />}
            {t.solved_post_id && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {t.title}
          </h1>
          <Button size="sm" variant={sub.data?.subscribed ? "default" : "outline"} onClick={toggleFollow}>
            {sub.data?.subscribed ? <><BellOff className="h-4 w-4 ml-1" />הפסק מעקב</> : <><Bell className="h-4 w-4 ml-1" />עקוב אחרי האשכול</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-6">{posts.length} הודעות · {t.view_count} צפיות</p>

        <div className="space-y-4">
          {(() => {
            const VIP_TIERS = new Set(["pro", "premium", "vip", "platinum"]);
            const childrenByParent = new Map<string, typeof posts>();
            for (const p of posts) {
              if (p.parent_post_id) {
                const arr = childrenByParent.get(p.parent_post_id) ?? [];
                arr.push(p);
                childrenByParent.set(p.parent_post_id, arr);
              }
            }
            const renderPost = (p: typeof posts[number], depth: number) => {
              const a = authors[p.author_id];
              const score = votes.data?.scores?.[p.id] ?? 0;
              const myVote = votes.data?.votes?.[p.id] ?? 0;
              const isMine = me === p.author_id;
              const isSolution = t.solved_post_id === p.id;
              const tier = (a as any)?.subscription_tier as string | undefined;
              const isVip = !!tier && VIP_TIERS.has(tier);
              const borderClass = isSolution
                ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                : isVip
                ? "border-amber-400/60 ring-1 ring-amber-400/30 shadow-[0_0_20px_-12px_rgba(251,191,36,0.5)]"
                : "border-border";
              return (
                <div key={p.id} className={depth > 0 ? "mr-4 sm:mr-8 border-r-2 border-border/60 pr-3 sm:pr-4" : ""}>
                  <div className={`rounded-lg border bg-card p-3 sm:p-4 ${borderClass}`}>
                    {depth > 0 && (
                      <div className="mb-2 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <CornerDownRight className="h-3 w-3" />תגובה לתגובה
                      </div>
                    )}
                    {isSolution && (
                      <div className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />פתרון מאושר
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {a?.avatar_url && <img src={a.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {a?.username ? (
                              <Link to="/u/$username" params={{ username: a.username }} className="font-medium hover:underline">{a.display_name ?? a.username}</Link>
                            ) : <span className="font-medium">{a?.display_name ?? "משתמש"}</span>}
                            <VipBadge tier={tier} />
                          </div>
                          <div className="text-xs text-muted-foreground">{a?.forum_rank} · {a?.forum_post_count ?? 0} הודעות · {a?.forum_reputation ?? 0} מוניטין</div>
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
                        <ForumEditor value={editBody} onChange={setEditBody} rows={6} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={submitEdit}>שמור</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>בטל</Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: sanitizeForumHtml(p.body_md) }}
                      />
                    )}

                    {a?.forum_signature && !p.is_deleted && (
                      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground italic whitespace-pre-wrap">{a.forum_signature}</div>
                    )}

                    {!p.is_deleted && (
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border flex-wrap">
                        <Button size="sm" variant={myVote === 1 ? "default" : "ghost"} onClick={() => doVote(p.id, myVote === 1 ? 0 : 1)} className="min-h-[40px]">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{score}</span>
                        <Button size="sm" variant={myVote === -1 ? "default" : "ghost"} onClick={() => doVote(p.id, myVote === -1 ? 0 : -1)} className="min-h-[40px]">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        {!t.is_locked && depth === 0 && !p.is_op && (
                          <Button size="sm" variant="ghost" onClick={() => { setReplyParent(p.id); setQuoted(null); document.getElementById("forum-reply-box")?.scrollIntoView({ behavior: "smooth" }); }}>
                            <Reply className="h-4 w-4 ml-1" />השב
                          </Button>
                        )}
                        {!t.is_locked && !p.is_op && (
                          <Button size="sm" variant="ghost" onClick={() => { setQuoted(p.id); setBody((b) => b + `<blockquote>${(p.body_md || "").slice(0, 200)}</blockquote><p></p>`); }}>
                            <Quote className="h-4 w-4 ml-1" />ציטוט
                          </Button>
                        )}
                        {isOpAuthor && !p.is_op && (
                          <Button size="sm" variant={isSolution ? "default" : "ghost"} onClick={() => toggleSolution(p.id)}>
                            <CheckCircle2 className="h-4 w-4 ml-1" />{isSolution ? "בטל פתרון" : "סמן כפתרון"}
                          </Button>
                        )}
                        {!isMine && (<>
                          <Button size="sm" variant="ghost" onClick={() => startDm(p.author_id)}><MessageCircle className="h-4 w-4 ml-1" />הודעה פרטית</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReportFor(p.id)}><Flag className="h-4 w-4 ml-1" />דווח</Button>
                        </>)}
                        {isMine && (<>
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(p.id); setEditBody(p.body_md); }}><Pencil className="h-4 w-4 ml-1" />ערוך</Button>
                          <Button size="sm" variant="ghost" onClick={async () => { if (confirm("למחוק?")) { await del({ data: { postId: p.id } }); qc.invalidateQueries({ queryKey: ["forum", "topic", slug] }); } }}>
                            <Trash2 className="h-4 w-4 ml-1" />מחק
                          </Button>
                        </>)}
                      </div>
                    )}
                  </div>
                  {depth === 0 && (childrenByParent.get(p.id) ?? []).length > 0 && (
                    <div className="mt-3 space-y-3">
                      {(childrenByParent.get(p.id) ?? []).map((child) => renderPost(child, depth + 1))}
                    </div>
                  )}
                </div>
              );
            };
            return posts.filter((p) => !p.parent_post_id).map((p) => renderPost(p, 0));
          })()}
        </div>

        {!t.is_locked && (
          <div id="forum-reply-box" className="mt-6 rounded-lg border border-border bg-card p-3 sm:p-4">
            <h3 className="font-semibold mb-2">{replyParent ? "הוסף תגובה לתגובה" : "הוסף תגובה"}</h3>
            {(quoted || replyParent) && (
              <div className="text-xs text-muted-foreground mb-2">
                {replyParent && <>תגובה מקוננת · <button className="underline" onClick={() => setReplyParent(null)}>בטל</button> · </>}
                {quoted && <>מצטט הודעה · <button className="underline" onClick={() => setQuoted(null)}>בטל</button></>}
              </div>
            )}
            <ForumEditor value={body} onChange={setBody} rows={6} placeholder="כתוב תגובה — תומך בעיצוב, תמונות, אודיו ו-YouTube" />
            <div className="mt-2 flex justify-end">
              <Button onClick={submitReply} disabled={body.replace(/<[^>]+>/g, "").trim().length === 0}>פרסם</Button>
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
