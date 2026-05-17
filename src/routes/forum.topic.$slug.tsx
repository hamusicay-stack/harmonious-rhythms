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
import { hasForumContent } from "@/lib/forum/utils";
import { ForumPostCard, type ForumPostData } from "@/components/forum/ForumPostCard";
import { ForumReplyTree } from "@/components/forum/ForumReplyTree";
import { TopicTagStrip } from "@/components/forum/TopicTagManager";
import { getTopicTags } from "@/lib/forum/tags.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, CheckCircle2, Bell, BellOff } from "lucide-react";
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
  const fetchTags = useServerFn(getTopicTags);
  const topicTags = useQuery({
    queryKey: ["forum", "topic-tags", topicId],
    queryFn: () => fetchTags({ data: { topicId: topicId! } }),
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

  const scrollToReplyBox = () => {
    document.getElementById("forum-reply-box")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitReply = async () => {
    if (!hasForumContent(body)) return;
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

  const handleQuote = (p: ForumPostData) => {
    setQuoted(p.id);
    setBody((b) => b + `<blockquote>${(p.body_md || "").slice(0, 200)}</blockquote><p></p>`);
    scrollToReplyBox();
  };

  const handleReply = (parentId: string) => {
    setReplyParent(parentId);
    setQuoted(null);
    scrollToReplyBox();
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("למחוק?")) return;
    try {
      await del({ data: { postId } });
      qc.invalidateQueries({ queryKey: ["forum", "topic", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };

  if (topic.isLoading) return <SiteLayout><div className="p-8" dir="rtl">טוען…</div></SiteLayout>;
  if (!topic.data?.topic) return <SiteLayout><div className="p-8" dir="rtl">האשכול לא נמצא</div></SiteLayout>;

  const t = topic.data.topic;
  const board = topic.data.board;
  const posts = topic.data.posts as ForumPostData[];
  const authors = topic.data.authors as Record<string, any>;
  const opPost = posts.find((p) => p.is_op) ?? posts[0];
  const isOpAuthor = !!me && me === t.author_id;
  const votesData = { scores: votes.data?.scores ?? {}, votes: (votes.data?.votes ?? {}) as Record<string, -1 | 0 | 1> };

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
        <p className="text-xs text-muted-foreground mb-3">{posts.length} הודעות · {t.view_count} צפיות</p>
        {topicTags.data?.tags && topicTags.data.tags.length > 0 && (
          <div className="mb-6"><TopicTagStrip tags={topicTags.data.tags} /></div>
        )}

        <div className="space-y-4">
          {opPost && (
            <ForumPostCard
              post={opPost}
              author={authors[opPost.author_id]}
              parentAuthor={null}
              depth={0}
              score={votesData.scores[opPost.id] ?? 0}
              myVote={(votesData.votes[opPost.id] ?? 0) as -1 | 0 | 1}
              isSolution={t.solved_post_id === opPost.id}
              isLocked={!!t.is_locked}
              isMine={me === opPost.author_id}
              isOpAuthor={isOpAuthor}
              editing={editing === opPost.id}
              editBody={editBody}
              onEditBodyChange={setEditBody}
              onSubmitEdit={submitEdit}
              onCancelEdit={() => setEditing(null)}
              onStartEdit={() => { setEditing(opPost.id); setEditBody(opPost.body_md); }}
              onDelete={() => handleDelete(opPost.id)}
              onVote={(v) => doVote(opPost.id, v)}
              onReply={() => handleReply(opPost.id)}
              onQuote={() => handleQuote(opPost)}
              onReport={() => setReportFor(opPost.id)}
              onMessage={() => startDm(opPost.author_id)}
              onToggleSolution={() => toggleSolution(opPost.id)}
            />
          )}

          <ForumReplyTree
            posts={posts}
            authors={authors}
            handlers={{
              me,
              isLocked: !!t.is_locked,
              isOpAuthorId: t.author_id,
              solvedPostId: t.solved_post_id ?? null,
              editingId: editing,
              editBody,
              votes: votesData,
              onEditBodyChange: setEditBody,
              onSubmitEdit: submitEdit,
              onCancelEdit: () => setEditing(null),
              onStartEdit: (postId, b) => { setEditing(postId); setEditBody(b); },
              onDelete: handleDelete,
              onVote: doVote,
              onReply: handleReply,
              onQuote: handleQuote,
              onReport: (postId) => setReportFor(postId),
              onMessage: startDm,
              onToggleSolution: toggleSolution,
            }}
          />
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
              <Button onClick={submitReply} disabled={!hasForumContent(body)}>פרסם</Button>
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
