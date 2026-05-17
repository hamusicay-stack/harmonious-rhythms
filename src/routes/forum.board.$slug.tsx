import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { listTopics, createTopic } from "@/lib/forum/topics.functions";
import { getBoardBySlug } from "@/lib/forum/boards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForumEditor } from "@/components/forum/ForumEditor";
import { hasForumContent } from "@/lib/forum/utils";
import { TopicTagManager } from "@/components/forum/TopicTagManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pin, Lock, Plus, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRoles } from "@/hooks/usePermission";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/forum/board/$slug")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: BoardPage,
});

function BoardPage() {
  const { slug } = Route.useParams();
  const fetchBoard = useServerFn(getBoardBySlug);
  const fetchTopics = useServerFn(listTopics);
  const create = useServerFn(createTopic);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const board = useQuery({ queryKey: ["forum", "board", slug], queryFn: () => fetchBoard({ data: { slug } }) });
  const topics = useQuery({ queryKey: ["forum", "topics", slug], queryFn: () => fetchTopics({ data: { boardSlug: slug, page: 1, pageSize: 30 } }) });

  const roles = useUserRoles() ?? [];
  const postMin = (((board.data?.board as any)?.post_min_role ?? "user") as "user" | "moderator" | "admin");
  const canPost = postMin === "user" || roles.includes("admin") || (postMin === "moderator" && (roles as string[]).includes("moderator"));

  const submit = async () => {
    if (title.trim().length < 3 || body.trim().length < 5) {
      toast.error("נא למלא כותרת וגוף");
      return;
    }
    setBusy(true);
    try {
      const r = await create({ data: { boardSlug: slug, title, body, tags: [], tagIds } });
      setTagIds([]);
      setOpen(false);
      navigate({ to: "/forum/topic/$slug", params: { slug: r.slug } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-5xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← חזרה לפורום</Link>
        <header className="flex items-center justify-between gap-4 my-4">
          <div>
            <h1 className="text-2xl font-bold">{board.data?.board?.name ?? "טוען…"}</h1>
            {board.data?.board?.description && <p className="text-sm text-muted-foreground">{board.data.board.description}</p>}
          </div>
          {!canPost ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 cursor-not-allowed">
                    <ShieldAlert className="h-4 w-4" />
                    אזור זה סגור לכתיבה על ידי ההנהלה בלבד
                  </span>
                </TooltipTrigger>
                <TooltipContent dir="rtl">קריאה בלבד — רק {postMin === "admin" ? "מנהלי המערכת" : "מנהלי הלוח"} יכולים לפתוח אשכולות חדשים כאן.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 ml-1" />אשכול חדש</Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-2xl">
                <DialogHeader><DialogTitle>פתיחת אשכול חדש</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="כותרת" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                  <ForumEditor value={body} onChange={setBody} placeholder="תוכן ההודעה — תוכל לעצב, להוסיף תמונות, אודיו וקישורי יוטיוב" />
                  <TopicTagManager value={tagIds} onChange={setTagIds} />
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={busy}>{busy ? "שולח…" : "פרסום"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </header>

        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {topics.isLoading && <div className="p-6 text-muted-foreground">טוען…</div>}
          {topics.data?.topics.length === 0 && <div className="p-6 text-center text-muted-foreground">אין אשכולות עדיין. היה הראשון לפתוח דיון!</div>}
          {topics.data?.topics.map((t) => (
            <Link key={t.id} to="/forum/topic/$slug" params={{ slug: t.slug }} className="block px-4 py-3 hover:bg-accent/40 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  {t.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                  {t.is_locked && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.author?.display_name ?? "משתמש"} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: he })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-left shrink-0">
                  <div>{t.reply_count} תגובות · {t.view_count} צפיות</div>
                  <div>אחרון: {formatDistanceToNow(new Date(t.last_post_at), { addSuffix: true, locale: he })}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
