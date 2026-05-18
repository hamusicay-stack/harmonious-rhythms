import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Pencil, X, Loader2, ExternalLink, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  image_url: string | null;
  category: string;
  source_url: string | null;
  is_automated: boolean | null;
  approval_status: string | null;
  created_at: string;
};

export function AIPendingQueue() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const runSync = async () => {
    setIsSyncing(true);
    toast.info("מתחיל סריקה ותרגום AI (זה עשוי לקחת כדקה)... 🤖");
    try {
      const { data, error } = await supabase.functions.invoke("ingest-ai-news", { method: "POST" });
      if (error) throw error;
      const inserted = (data as any)?.inserted ?? 0;
      toast.success(
        inserted > 0
          ? `הסריקה הושלמה! ${inserted} כתבות חדשות ממתינות לאישור. ✨`
          : "הסריקה הושלמה! לא נמצאו כתבות חדשות. ✨",
      );
      await load();
    } catch (e) {
      toast.error(friendlyError(e, "הסריקה נכשלה"));
    } finally {
      setIsSyncing(false);
    }
  };

  const [editing, setEditing] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("music_news")
      .select("id, title, slug, summary, content, image_url, category, source_url, is_automated, approval_status, created_at")
      .eq("is_automated", true)
      .eq("approval_status", "pending_review")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(friendlyError(error, "טעינת התור נכשלה"));
    } else {
      setItems((data ?? []) as Article[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (a: Article) => {
    setBusyId(a.id);
    const { error } = await (supabase as any)
      .from("music_news")
      .update({ approval_status: "approved" })
      .eq("id", a.id);
    setBusyId(null);
    if (error) {
      toast.error(friendlyError(error, "האישור נכשל"));
      return;
    }
    toast.success("הכתבה פורסמה בהצלחה באתר! 🚀");
    setItems((p) => p.filter((x) => x.id !== a.id));
  };

  const reject = async (a: Article) => {
    if (!confirm("למחוק את הכתבה מהתור?")) return;
    setBusyId(a.id);
    const { error } = await (supabase as any).from("music_news").delete().eq("id", a.id);
    setBusyId(null);
    if (error) {
      toast.error(friendlyError(error, "המחיקה נכשלה"));
      return;
    }
    toast.success("הכתבה הוסרה מהתור");
    setItems((p) => p.filter((x) => x.id !== a.id));
  };

  const openEdit = (a: Article) => {
    setEditing(a);
    setEditTitle(a.title);
    setEditSummary(a.summary ?? "");
    setEditContent(a.content);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("music_news")
      .update({
        title: editTitle,
        summary: editSummary || null,
        content: editContent,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "השמירה נכשלה"));
      return;
    }
    toast.success("הטקסט עודכן ✍️");
    setItems((p) =>
      p.map((x) =>
        x.id === editing.id ? { ...x, title: editTitle, summary: editSummary, content: editContent } : x,
      ),
    );
    setEditing(null);
  };

  return (
    <div dir="rtl" className="rounded-xl border border-gold/20 bg-card/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/10 ring-1 ring-gold/30">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-gradient-gold">תור כתבות AI ממתינות</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              סקירה מהירה ואישור של כתבות שנכתבו אוטומטית ע"י המנוע
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Badge className="bg-gold/15 text-gold border border-gold/40">{items.length} ממתינות</Badge>
          )}
          <Button
            onClick={runSync}
            disabled={isSyncing}
            className="bg-gradient-to-r from-gold to-amber-400 text-gold-foreground hover:from-gold/90 hover:to-amber-400/90 shadow-[0_0_20px_-5px_hsl(var(--gold)/0.5)]"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <RefreshCw className="h-4 w-4 ml-2" />
            )}
            🔄 סרוק מקורות עכשיו
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          התור ריק. כל הכתבות אושרו או שאין כתבות חדשות 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row gap-4 rounded-xl border border-gold/15 bg-background/40 p-4 hover:border-gold/40 transition-colors"
            >
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-full sm:w-36 aspect-video sm:aspect-square shrink-0 object-cover rounded-lg ring-1 ring-gold/10"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/40 text-[10px]">
                    <Bot className="h-3 w-3 ml-1" />
                    🤖 נכתב ע"י בינה מלאכותית
                  </Badge>
                  {a.source_url && (
                    <a
                      href={a.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-gold inline-flex items-center gap-1"
                    >
                      מקור מקורי
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
                <h3 className="font-display text-base font-semibold leading-snug line-clamp-2">
                  {a.title}
                </h3>
                {a.summary && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(a)}
                    disabled={busyId === a.id}
                    className="border-gold/30 hover:bg-gold/10 hover:text-gold"
                  >
                    <Pencil className="h-3.5 w-3.5 ml-1" />
                    🔍 ערוך טקסט
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approve(a)}
                    disabled={busyId === a.id}
                    className="bg-gold text-gold-foreground hover:bg-gold/90"
                  >
                    {busyId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                    ) : (
                      <Check className="h-3.5 w-3.5 ml-1" />
                    )}
                    ✅ אשר ופרסם
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reject(a)}
                    disabled={busyId === a.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5 ml-1" />
                    🗑️ דחה
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold">עריכת כתבה AI לפני פרסום</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">כותרת</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={180}
                className="mt-1 bg-background/60 border-gold/20"
              />
            </div>
            <div>
              <Label className="text-sm">תקציר SEO</Label>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 bg-background/60 border-gold/20 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm">תוכן (HTML/Markdown)</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                maxLength={50000}
                className="mt-1 bg-background/60 border-gold/20 font-mono text-sm leading-relaxed"
              />
            </div>
            {editContent && (
              <div className="rounded-lg border border-gold/10 bg-background/40 p-3">
                <div className="text-[11px] text-muted-foreground mb-2">תצוגה מקדימה</div>
                <div
                  className="prose prose-invert max-w-none prose-sm prose-headings:text-gold prose-a:text-gold"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(editContent) }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ביטול
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
