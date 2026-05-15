import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/contexts/AuthContext";
import { listCategoriesWithBoards } from "@/lib/forum/boards.functions";
import { MessageSquare, Search, Bell, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export const Route = createFileRoute("/forum")({
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["forum", "index"],
    queryFn: () => fetchData(),
    enabled: !!user,
    retry: false,
  });
  const categories = data?.categories ?? [];

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              פורום הקהילה
            </h1>
            <p className="text-sm text-muted-foreground mt-1">דיון, מוניטין וקהילה.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/forum/search" search={{ q: "" } as never}><Search className="h-4 w-4 ml-1" />חיפוש</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/forum/notifications"><Bell className="h-4 w-4 ml-1" />התראות</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/forum/messages"><Mail className="h-4 w-4 ml-1" />הודעות</Link>
            </Button>
          </div>
        </header>

        {authLoading && <p className="text-muted-foreground">טוען…</p>}

        {!authLoading && !user && (
          <section className="rounded-lg border border-border bg-card p-6 text-center">
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

        {!!user && !error && <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="font-semibold text-lg" style={{ color: cat.color ?? undefined }}>{cat.name}</h2>
                {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
              </div>
              <div className="divide-y divide-border">
                {cat.boards.length === 0 && (
                  <div className="px-4 py-6 text-sm text-muted-foreground">אין לוחות בקטגוריה זו עדיין.</div>
                )}
                {cat.boards.map((b) => (
                  <Link
                    key={b.id}
                    to="/forum/board/$slug"
                    params={{ slug: b.slug }}
                    className="block px-4 py-3 hover:bg-accent/40 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium">{b.name}</div>
                        {b.description && <div className="text-xs text-muted-foreground truncate">{b.description}</div>}
                      </div>
                      <div className="text-xs text-muted-foreground text-left shrink-0">
                        <div>{b.topic_count} אשכולות · {b.post_count} הודעות</div>
                        {b.last_post_at && (
                          <div>פעילות אחרונה: {formatDistanceToNow(new Date(b.last_post_at), { addSuffix: true, locale: he })}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>}
      </div>
    </SiteLayout>
  );
}
