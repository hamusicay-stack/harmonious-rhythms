import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Check, X, ExternalLink, RefreshCw, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { sanitizeHtml } from "@/lib/sanitize";
import { WikiGenerator } from "./WikiGenerator";

type WikiArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  content: string;
  approval_status: string;
  is_verified: boolean;
  views_count: number | null;
  created_at: string;
};

type WikiRevision = {
  id: string;
  article_id: string;
  suggested_title: string | null;
  suggested_summary: string | null;
  suggested_html: string;
  status: string;
  submitted_by: string | null;
  created_at: string;
  article?: { title: string; slug: string; content: string } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  instruments: "כלי נגינה",
  audio_tech: "סאונד והפקה",
  artists: "אמנים",
  music_theory: "תיאוריה",
};

export function WikiManager() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="bg-card border border-amber-500/20">
          <TabsTrigger value="generator">✨ מחולל AI</TabsTrigger>
          <TabsTrigger value="active">📚 ערכים פעילים</TabsTrigger>
          <TabsTrigger value="pending">⏳ ערכים בהמתנה</TabsTrigger>
          <TabsTrigger value="revisions">✍️ הצעות עריכה</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="mt-6">
          <WikiGenerator />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <ActiveArticles />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <PendingArticles />
        </TabsContent>

        <TabsContent value="revisions" className="mt-6">
          <PendingRevisions />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Active Articles =============
function ActiveArticles() {
  const [rows, setRows] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("wiki_articles")
      .select("id,title,slug,category,summary,content,approval_status,is_verified,views_count,created_at")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data ?? []) as WikiArticle[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`למחוק לצמיתות את "${title}"?`)) return;
    const { error } = await (supabase as any).from("wiki_articles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק בהצלחה");
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{rows.length} ערכים מאושרים</h3>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} /> רענן
        </Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-amber-500/20 rounded-xl">
          אין ערכים מאושרים עדיין.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-card p-3 hover:border-amber-400/40 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{r.title}</span>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </Badge>
                </div>
                {r.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.summary}</p>
                )}
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{r.views_count ?? 0}</span>
                  <span>{new Date(r.created_at).toLocaleDateString("he-IL")}</span>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="border-amber-500/30">
                <Link to="/wiki/$slug" params={{ slug: r.slug }}>
                  <ExternalLink className="h-4 w-4 ml-1" /> צפה
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id, r.title)}>
                <Trash2 className="h-4 w-4 ml-1" /> מחק
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= Pending Articles =============
function PendingArticles() {
  const [rows, setRows] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("wiki_articles")
      .select("id,title,slug,category,summary,content,approval_status,is_verified,views_count,created_at")
      .eq("approval_status", "pending_review")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as WikiArticle[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await (supabase as any)
      .from("wiki_articles")
      .update({ approval_status: "approved", is_verified: true })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("הערך אושר ופורסם");
    setRows((p) => p.filter((r) => r.id !== id));
  };
  const reject = async (id: string) => {
    if (!confirm("לדחות ולמחוק את ההצעה?")) return;
    const { error } = await (supabase as any).from("wiki_articles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נדחה");
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{rows.length} ערכים בהמתנה לאישור</h3>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} /> רענן
        </Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-amber-500/20 rounded-xl">
          אין הצעות חדשות בהמתנה.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-amber-500/15 bg-card p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-bold text-base">{r.title}</span>
                <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                  {CATEGORY_LABEL[r.category] ?? r.category}
                </Badge>
                <span className="text-xs text-muted-foreground mr-auto">
                  {new Date(r.created_at).toLocaleString("he-IL")}
                </span>
              </div>
              {r.summary && <p className="text-sm text-muted-foreground mb-2">{r.summary}</p>}
              <div
                className="prose prose-invert prose-sm max-w-none max-h-60 overflow-y-auto bg-background/40 rounded p-3 border border-amber-500/10"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.content) }}
              />
              <div className="flex gap-2 mt-3 justify-end">
                <Button variant="destructive" size="sm" onClick={() => reject(r.id)}>
                  <X className="h-4 w-4 ml-1" /> דחה
                </Button>
                <Button size="sm" onClick={() => approve(r.id)} className="bg-amber-500 text-black hover:bg-amber-400">
                  <Check className="h-4 w-4 ml-1" /> אשר ופרסם
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= Pending Revisions =============
function PendingRevisions() {
  const [rows, setRows] = useState<WikiRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<WikiRevision | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: revs } = await (supabase as any)
      .from("wiki_revisions")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    const list = (revs ?? []) as WikiRevision[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.article_id)));
      const { data: arts } = await (supabase as any)
        .from("wiki_articles")
        .select("id,title,slug,content")
        .in("id", ids);
      const map = new Map((arts ?? []).map((a: any) => [a.id, a]));
      list.forEach((r) => { r.article = (map.get(r.article_id) as WikiRevision["article"]) ?? null; });
    }
    setRows(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (rev: WikiRevision) => {
    if (!rev.article) { toast.error("הערך המקורי לא נמצא"); return; }
    const updates: any = { content: rev.suggested_html };
    if (rev.suggested_title?.trim()) updates.title = rev.suggested_title.trim();
    if (rev.suggested_summary?.trim()) updates.summary = rev.suggested_summary.trim();

    const { error: e1 } = await (supabase as any)
      .from("wiki_articles")
      .update(updates)
      .eq("id", rev.article_id);
    if (e1) { toast.error(e1.message); return; }

    const { error: e2 } = await (supabase as any)
      .from("wiki_revisions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", rev.id);
    if (e2) { toast.error(e2.message); return; }

    toast.success("ההצעה אושרה והערך עודכן");
    setViewing(null);
    setRows((p) => p.filter((r) => r.id !== rev.id));
  };

  const reject = async (rev: WikiRevision) => {
    const { error } = await (supabase as any)
      .from("wiki_revisions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", rev.id);
    if (error) { toast.error(error.message); return; }
    toast.success("ההצעה נדחתה");
    setViewing(null);
    setRows((p) => p.filter((r) => r.id !== rev.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{rows.length} הצעות עריכה ממתינות</h3>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} /> רענן
        </Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-amber-500/20 rounded-xl">
          אין הצעות עריכה ממתינות.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {r.article?.title ?? "ערך נמחק"}
                  {r.suggested_title && r.suggested_title !== r.article?.title && (
                    <span className="text-amber-300 text-sm mr-2">→ {r.suggested_title}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("he-IL")}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setViewing(r)}>
                <Eye className="h-4 w-4 ml-1" /> השווה
              </Button>
              <Button variant="destructive" size="sm" onClick={() => reject(r)}>
                <X className="h-4 w-4 ml-1" /> דחה
              </Button>
              <Button size="sm" onClick={() => approve(r)} className="bg-amber-500 text-black hover:bg-amber-400">
                <Check className="h-4 w-4 ml-1" /> אשר
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="bg-card border-amber-500/30 max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-300">
              השוואה — {viewing?.article?.title ?? "ערך"}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-bold text-muted-foreground mb-2">הגרסה הנוכחית</div>
                <div
                  className="prose prose-invert prose-sm max-w-none bg-background/40 rounded p-3 border border-amber-500/10 max-h-[60vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewing.article?.content ?? "") }}
                />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-300 mb-2">ההצעה החדשה</div>
                <div
                  className="prose prose-invert prose-sm max-w-none bg-amber-500/5 rounded p-3 border border-amber-500/30 max-h-[60vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewing.suggested_html) }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => viewing && reject(viewing)}>
              <X className="h-4 w-4 ml-1" /> דחה הצעה
            </Button>
            <Button
              onClick={() => viewing && approve(viewing)}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              <Check className="h-4 w-4 ml-1" /> אשר והחל על הערך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
