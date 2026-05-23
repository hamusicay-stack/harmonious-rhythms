import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireAdmin } from "@/lib/routeGuards";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  updated_at: string;
};

export const Route = createFileRoute("/admin/content/pages")({
  beforeLoad: requireAdmin,
  component: PagesListPage,
  head: () => ({ meta: [{ title: "ניהול דפי אתר | אדמין" }] }),
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl p-6 text-center" dir="rtl">
        <h2 className="text-xl font-bold mb-2">שגיאה בטעינת מנהל הדפים</h2>
        <pre className="text-xs text-destructive bg-muted p-3 rounded mb-4 whitespace-pre-wrap text-start">{String(error?.message ?? error)}</pre>
        <Button onClick={() => reset()}>נסה שוב</Button>
      </div>
    </SiteLayout>
  ),
});

function PagesListPage() {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_pages")
        .select("id, title, slug, is_published, updated_at")
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("[site_pages load]", error);
        toast.error("שגיאה בטעינת דפים: " + error.message);
      }
      setRows((data ?? []) as PageRow[]);
    } catch (e) {
      console.error("[site_pages load exception]", e);
      toast.error("שגיאה לא צפויה בטעינת דפים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createNew = async () => {
    const title = window.prompt("כותרת הדף החדש:");
    if (!title) return;
    const slug = window.prompt("מזהה (slug, אנגלית):", title.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    const reason = window.prompt("סיבת היצירה (חובה לאודיט):");
    if (!reason || reason.trim().length < 3) { toast.error("נדרשת סיבה"); return; }
    const { data, error } = await (supabase as any).rpc("admin_save_site_page", {
      p_id: null, p_title: title, p_slug: slug,
      p_content_html: "<p>תוכן חדש...</p>", p_is_published: false, p_reason: reason,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("נוצר");
    window.location.href = `/admin/content/pages/${data}`;
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8" dir="rtl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link to="/admin/content" className="text-sm text-muted-foreground hover:underline">← מנהל תוכן</Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">ניהול דפי אתר</h1>
            <p className="text-sm text-muted-foreground">דפים סטטיים עם עורך עשיר ובונה שאלות נפוצות.</p>
          </div>
          <Button onClick={createNew}><Plus className="me-1 h-4 w-4" /> דף חדש</Button>
        </div>

        <Card className="border-primary/20">
          <CardHeader><CardTitle className="text-base">כל הדפים</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">אין דפים. צור דף חדש כדי להתחיל.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{r.title}</span>
                        <Badge variant={r.is_published ? "default" : "secondary"}>
                          {r.is_published ? "פורסם" : "טיוטה"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">/{r.slug} · עודכן {new Date(r.updated_at).toLocaleString("he-IL")}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/content/pages/$id" params={{ id: r.id }}>
                          <Pencil className="me-1 h-4 w-4" /> ערוך
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
