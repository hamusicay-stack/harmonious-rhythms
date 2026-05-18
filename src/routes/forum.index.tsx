import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { listCategoriesWithBoards } from "@/lib/forum/boards.functions";
import { getRecentActivity } from "@/lib/forum/activity.functions";
import { MessageSquare, Search, Bell, Mail, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { ForumCategoryCard } from "@/components/forum/ForumCategoryCard";

export const Route = createFileRoute("/forum/")({
  head: () => ({
    meta: [
      { title: "פורום הקהילה — המוזיקאי" },
      { name: "description", content: "דיונים, שאלות וטיפים בקהילת המוזיקאים." },
    ],
  }),
  component: ForumIndexPage,
});

function ForumIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const fetchData = useServerFn(listCategoriesWithBoards);
  const fetchActivity = useServerFn(getRecentActivity);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forum", "index"],
    queryFn: () => fetchData(),
    enabled: !!user,
    retry: false,
  });
  const activity = useQuery({
    queryKey: ["forum", "activity"],
    queryFn: () => fetchActivity(),
    enabled: !!user,
    retry: false,
  });
  const categories = data?.categories ?? [];

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("forum-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" },
        () => qc.invalidateQueries({ queryKey: ["forum", "activity"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    navigate({ to: "/forum/search", search: { q: q.trim() } as never });
  };

  return (
    <SiteLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <MessageSquare className="h-7 w-7 text-primary" />
                פורום הקהילה
              </h1>
              <p className="text-sm text-muted-foreground mt-1">דיון, מוניטין וקהילה.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                <Link to="/forum/notifications"><Bell className="h-4 w-4 ml-1" />התראות</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                <Link to="/forum/messages"><Mail className="h-4 w-4 ml-1" />הודעות</Link>
              </Button>
            </div>
          </header>

          {!!user && (
            <form onSubmit={submitSearch} className="mb-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש בפורום: מילות מפתח, תגיות (#Yamaha, #Korg, #Mixing)…"
                  className="pr-10 min-h-[44px]"
                />
              </div>
              <Button type="submit" className="min-h-[44px]">חיפוש</Button>
            </form>
          )}

          {authLoading && <p className="text-muted-foreground">טוען…</p>}

          {!authLoading && !user && (
            <section className="rounded-xl border border-border bg-card p-6 text-center">
              <h2 className="text-xl font-semibold">הפורום פתוח לחברי הקהילה</h2>
              <p className="mt-2 text-sm text-muted-foreground">התחברו או הירשמו כדי לצפות בדיונים, לפתוח אשכולות ולקבל התראות.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/auth" search={{ redirect: "/forum" } as never}>כניסה לפורום</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/auth" search={{ mode: "signup", redirect: "/forum" } as never}>הרשמה</Link>
                </Button>
              </div>
            </section>
          )}

          {!!user && isLoading && <p className="text-muted-foreground">טוען…</p>}

          {!!user && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              לא ניתן לטעון את הפורום כרגע. נסו לרענן או להתחבר מחדש.
            </div>
          )}

          {!!user && !error && (
            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
              <div className="space-y-5 min-w-0">
                {categories.map((cat) => (
                  <ForumCategoryCard key={cat.id} category={cat as never} />
                ))}
              </div>

              <aside className="lg:sticky lg:top-20 lg:self-start">
                <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold">פעילות אחרונה</h2>
                    <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-label="חי" />
                  </div>
                  <div className="divide-y divide-border">
                    {activity.isLoading && <div className="px-4 py-4 text-sm text-muted-foreground">טוען…</div>}
                    {activity.data?.items?.length === 0 && (
                      <div className="px-4 py-4 text-sm text-muted-foreground">אין פעילות עדיין.</div>
                    )}
                    {activity.data?.items?.map((it) => (
                      <Link
                        key={it.id}
                        to="/forum/topic/$slug"
                        params={{ slug: it.topic_slug! }}
                        className="block px-4 py-3 hover:bg-accent/40 transition"
                      >
                        <div className="text-xs text-muted-foreground">
                          {it.author_name} · {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale: he })}
                        </div>
                        <div className="font-medium text-sm truncate">{it.topic_title}</div>
                        {it.excerpt && <div className="text-xs text-muted-foreground truncate mt-0.5">{it.excerpt}</div>}
                      </Link>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
