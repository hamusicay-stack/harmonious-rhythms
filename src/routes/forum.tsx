import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Loader2, Pin, MessageCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "פורום — המוזיקאי" },
      { name: "description", content: "דיונים, שאלות וטיפים בקהילת המוזיקאים." },
      { property: "og:title", content: "פורום — המוזיקאי" },
      { property: "og:description", content: "דיונים, שאלות וטיפים בקהילת המוזיקאים." },
    ],
  }),
  component: ForumPage,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
};

type Post = {
  id: string;
  title: string;
  content: string;
  category_id: string;
  author_id: string;
  is_pinned: boolean;
  views: number;
  created_at: string;
  category: { name: string; slug: string } | null;
  author: { display_name: string | null; avatar_url: string | null } | null;
  comment_count: number;
};

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "עכשיו";
  if (sec < 3600) return `לפני ${Math.floor(sec / 60)} דק׳`;
  if (sec < 86400) return `לפני ${Math.floor(sec / 3600)} שע׳`;
  if (sec < 604800) return `לפני ${Math.floor(sec / 86400)} ימים`;
  return new Date(iso).toLocaleDateString("he-IL");
}

function ForumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category_id: "" });

  const loadData = async () => {
    setLoading(true);
    const [{ data: cats }, { data: rawPosts }] = await Promise.all([
      supabase.from("forum_categories").select("*").order("display_order"),
      supabase
        .from("forum_posts")
        .select("id, title, content, category_id, author_id, is_pinned, views, created_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setCategories((cats ?? []) as Category[]);

    const postsList = (rawPosts ?? []) as Omit<Post, "category" | "author" | "comment_count">[];
    if (postsList.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set(postsList.map((p) => p.author_id))];
    const postIds = postsList.map((p) => p.id);

    const [{ data: profiles }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds),
      supabase.from("forum_comments").select("post_id").in("post_id", postIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
    const commentCounts = new Map<string, number>();
    (comments ?? []).forEach((c: { post_id: string }) => {
      commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
    });

    const enriched: Post[] = postsList.map((p) => ({
      ...p,
      category: catMap.get(p.category_id) ? { name: catMap.get(p.category_id)!.name, slug: catMap.get(p.category_id)!.slug } : null,
      author: profileMap.get(p.author_id) ?? null,
      comment_count: commentCounts.get(p.id) ?? 0,
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = activeCategory ? posts.filter((p) => p.category_id === activeCategory) : posts;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!newPost.title.trim() || !newPost.content.trim() || !newPost.category_id) {
      toast.error("מלאו את כל השדות");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("forum_posts").insert({
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category_id: newPost.category_id,
        author_id: user.id,
      });
      if (error) throw error;
      toast.success("הפוסט נוצר בהצלחה");
      setDialogOpen(false);
      setNewPost({ title: "", content: "", category_id: "" });
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת הפוסט");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container mx-auto px-4 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-gold">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">השיחה <span className="text-gradient-gold">של הקהילה</span></h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              כאן שואלים בלי בושה, משתפים בלי פילטר ומתייעצים עם מוזיקאים שמדברים את השפה שלכם.
            </p>
            <div className="mt-8 flex justify-center">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        toast.info("יש להתחבר כדי לפתוח דיון");
                        navigate({ to: "/auth" });
                      }
                    }}
                  >
                    <Plus className="ml-2 h-5 w-5" />
                    פתחו דיון חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-right font-display text-2xl">דיון חדש</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>קטגוריה</Label>
                      <Select value={newPost.category_id} onValueChange={(v) => setNewPost({ ...newPost, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="בחרו קטגוריה" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>כותרת</Label>
                      <Input value={newPost.title}
                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                        placeholder="במה תרצו לדון?" maxLength={200} required />
                    </div>
                    <div className="space-y-2">
                      <Label>תוכן</Label>
                      <Textarea value={newPost.content} rows={6}
                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                        placeholder="פרטו את השאלה / הנושא..." required />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={submitting}
                        className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                        {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        פרסום
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <Button variant={activeCategory === null ? "default" : "outline"} size="sm"
            onClick={() => setActiveCategory(null)}>
            הכל
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={activeCategory === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card-elevated p-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">עדיין אין דיונים בקטגוריה זו. היו הראשונים!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => {
              const initials = (post.author?.display_name || "?").split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
              return (
                <article key={post.id}
                  className="group flex gap-4 rounded-2xl border border-border/60 bg-card-elevated p-5 transition-smooth hover:border-primary/40 hover:shadow-gold">
                  <Avatar className="h-12 w-12 shrink-0 border border-border/60">
                    <AvatarImage src={post.author?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-sm font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {post.category && <Badge variant="secondary" className="text-xs">{post.category.name}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {post.author?.display_name ?? "משתמש"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold transition-smooth group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {post.content}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post.comment_count} תגובות
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!user && (
          <div className="mt-10 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center">
            <p className="text-sm text-muted-foreground">
              רוצים להשתתף בדיונים?{" "}
              <Link to="/auth" className="font-semibold text-primary hover:underline">הצטרפו לקהילה</Link>
            </p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
