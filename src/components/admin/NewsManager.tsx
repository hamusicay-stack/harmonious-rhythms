import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { Newspaper, Eye, Pencil, Check, Bot, Megaphone, Loader2, X, Plus, Sparkles, Trash2, Globe, Search, EyeOff } from "lucide-react";
import { NewsSourcesManager } from "@/components/admin/NewsSourcesManager";
import { AIPendingQueue } from "@/components/admin/AIPendingQueue";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  submitted_by_pr: boolean | null;
  approval_status: string | null;
  views_count: number | null;
  created_at: string;
  author_id: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  singles: "סינגלים",
  albums: "אלבומים",
  events: "אירועים",
  gear_reviews: "סיקורי ציוד",
  interviews: "ראיונות",
};

function ArticleCard({
  article,
  mode,
  onPreview,
  onEdit,
  onApprove,
  onReject,
  onUnpublish,
  onDelete,
  approving,
  busy,
}: {
  article: Article;
  mode: "pending" | "published";
  onPreview: () => void;
  onEdit: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
  approving?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 rounded-xl border border-gold/15 bg-card/60 p-4 backdrop-blur-sm hover:border-gold/40 transition-colors">
      <div className="relative w-full sm:w-44 aspect-video sm:aspect-square shrink-0 overflow-hidden rounded-lg bg-black">
        {article.image_url ? (
          <img src={article.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
            ללא תמונה
          </div>
        )}
        <Badge
          variant="outline"
          className="absolute top-2 right-2 border-gold/60 text-gold bg-black/60 backdrop-blur-sm text-[10px]"
        >
          {CATEGORY_LABELS[article.category] ?? article.category}
        </Badge>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base sm:text-lg font-semibold leading-snug line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <span>{new Date(article.created_at).toLocaleString("he-IL")}</span>
          {typeof article.views_count === "number" && (
            <span>· {article.views_count} צפיות</span>
          )}
          {article.is_automated && (
            <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/40 text-[10px]">
              <Bot className="h-3 w-3 ml-1" />AI
            </Badge>
          )}
          {article.submitted_by_pr && (
            <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/40 text-[10px]">PR</Badge>
          )}
          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline truncate max-w-[200px]"
            >
              מקור חיצוני ↗
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className="border-gold/30 hover:bg-gold/10 hover:text-gold"
          >
            <Eye className="h-3.5 w-3.5 ml-1" />
            צפייה מקדימה
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="border-gold/30 hover:bg-gold/10 hover:text-gold"
          >
            <Pencil className="h-3.5 w-3.5 ml-1" />
            ערוך
          </Button>

          {mode === "pending" && onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={approving}
              className="bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
              ) : (
                <Check className="h-3.5 w-3.5 ml-1" />
              )}
              אשר לפרסום
            </Button>
          )}
          {mode === "pending" && onReject && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5 ml-1" />
              דחה
            </Button>
          )}

          {mode === "published" && onUnpublish && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnpublish}
              disabled={busy}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <EyeOff className="h-3.5 w-3.5 ml-1" />
              הסר מפרסום
            </Button>
          )}
          {mode === "published" && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={busy}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 ml-1" />
              )}
              מחק לצמיתות
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewsManager() {
  const [prArticles, setPrArticles] = useState<Article[]>([]);
  const [aiArticles, setAiArticles] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [publishedSearch, setPublishedSearch] = useState("");
  const [publishedCategory, setPublishedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [previewing, setPreviewing] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Create new article (admin instant publish)
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("singles");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const slugify = (t: string) => {
    const base = t.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
    return `${base || "article"}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const resetCreate = () => {
    setNewTitle(""); setNewCategory("singles"); setNewSummary(""); setNewContent(""); setNewImageUrl("");
  };

  const createArticle = async () => {
    if (!newTitle.trim() || newTitle.trim().length < 3) {
      toast.error("כותרת חייבת לפחות 3 תווים");
      return;
    }
    if (!newContent.trim() || newContent.trim().length < 20) {
      toast.error("התוכן קצר מדי");
      return;
    }
    setCreating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        toast.error("יש להתחבר למערכת");
        setCreating(false);
        return;
      }
      const { error } = await (supabase as any).from("music_news").insert({
        title: newTitle.trim(),
        slug: slugify(newTitle),
        category: newCategory,
        summary: newSummary.trim() || null,
        content: newContent.trim(),
        image_url: newImageUrl.trim() || null,
        author_id: uid,
        approval_status: "approved",
        is_automated: false,
        submitted_by_pr: false,
      });
      if (error) throw error;
      toast.success("נשמר בהצלחה! ✅");
      resetCreate();
      setCreateOpen(false);
      load();
    } catch (e: any) {
      toast.error(friendlyError(e, "שגיאה בשמירה. ודא שאתה מחובר למערכת."));
    } finally {
      setCreating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("music_news")
      .select("*")
      .eq("approval_status", "pending_review")
      .order("created_at", { ascending: false });
    const all = (data ?? []) as Article[];
    setPrArticles(all.filter((a) => a.submitted_by_pr));
    setAiArticles(all.filter((a) => a.is_automated));
    setLoading(false);
  };

  const loadPublished = async () => {
    setLoadingPublished(true);
    const { data } = await (supabase as any)
      .from("music_news")
      .select("*")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);
    setPublishedArticles((data ?? []) as Article[]);
    setLoadingPublished(false);
  };

  useEffect(() => {
    load();
    loadPublished();
  }, []);

  const approve = async (a: Article) => {
    setApprovingId(a.id);
    const { error } = await (supabase as any)
      .from("music_news")
      .update({ approval_status: "approved" })
      .eq("id", a.id);
    setApprovingId(null);
    if (error) {
      toast.error("שגיאה באישור");
      return;
    }
    toast.success("הכתבה אושרה ופורסמה למגזין ✨");
    setPrArticles((p) => p.filter((x) => x.id !== a.id));
    setAiArticles((p) => p.filter((x) => x.id !== a.id));
    setPublishedArticles((p) => [{ ...a, approval_status: "approved" }, ...p]);
  };

  const reject = async (a: Article) => {
    const { error } = await (supabase as any)
      .from("music_news")
      .update({ approval_status: "rejected" })
      .eq("id", a.id);
    if (error) {
      toast.error("שגיאה בדחייה");
      return;
    }
    toast.success("הכתבה נדחתה");
    setPrArticles((p) => p.filter((x) => x.id !== a.id));
    setAiArticles((p) => p.filter((x) => x.id !== a.id));
  };

  const unpublish = async (a: Article) => {
    if (!confirm(`להסיר את הכתבה "${a.title}" מהפרסום? היא תחזור לתור הממתינים.`)) return;
    setRowBusyId(a.id);
    const { error } = await (supabase as any)
      .from("music_news")
      .update({ approval_status: "pending_review" })
      .eq("id", a.id);
    setRowBusyId(null);
    if (error) {
      toast.error(friendlyError(error, "ההסרה נכשלה"));
      return;
    }
    toast.success("הכתבה הוסרה מהפרסום וחזרה לתור");
    setPublishedArticles((p) => p.filter((x) => x.id !== a.id));
    const updated = { ...a, approval_status: "pending_review" } as Article;
    if (a.submitted_by_pr) setPrArticles((p) => [updated, ...p]);
    if (a.is_automated) setAiArticles((p) => [updated, ...p]);
  };

  const remove = async (a: Article) => {
    if (!confirm(`למחוק לצמיתות את הכתבה "${a.title}"? פעולה זו אינה הפיכה.`)) return;
    setRowBusyId(a.id);
    const { error } = await (supabase as any).from("music_news").delete().eq("id", a.id);
    setRowBusyId(null);
    if (error) {
      toast.error(friendlyError(error, "המחיקה נכשלה"));
      return;
    }
    toast.success("הכתבה נמחקה לצמיתות 🗑️");
    setPublishedArticles((p) => p.filter((x) => x.id !== a.id));
    setPrArticles((p) => p.filter((x) => x.id !== a.id));
    setAiArticles((p) => p.filter((x) => x.id !== a.id));
  };

  const openEdit = (a: Article) => {
    setEditing(a);
    setEditTitle(a.title);
    setEditSummary(a.summary ?? "");
    setEditContent(a.content);
    setEditCategory(a.category ?? "");
    setEditImageUrl(a.image_url ?? "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const newCat = editCategory.trim() || editing.category;
    const newImg = editImageUrl.trim() || null;
    const { error } = await (supabase as any)
      .from("music_news")
      .update({
        title: editTitle,
        summary: editSummary || null,
        content: editContent,
        category: newCat,
        image_url: newImg,
      })
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) {
      toast.error(friendlyError(error, "שמירה נכשלה"));
      return;
    }
    toast.success("הטקסט עודכן");
    const patch = (arr: Article[]) =>
      arr.map((a) =>
        a.id === editing.id
          ? { ...a, title: editTitle, summary: editSummary, content: editContent, category: newCat, image_url: newImg }
          : a,
      );
    setPrArticles(patch);
    setAiArticles(patch);
    setPublishedArticles(patch);
    setEditing(null);
  };

  const knownCategories = Array.from(
    new Set(
      [...publishedArticles, ...prArticles, ...aiArticles]
        .map((a) => a.category)
        .filter(Boolean),
    ),
  ) as string[];

  const filteredPublished = publishedArticles.filter((a) => {
    if (publishedCategory !== "all" && a.category !== publishedCategory) return false;
    if (publishedSearch.trim()) {
      const q = publishedSearch.trim().toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.summary ?? "").toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const Section = ({
    items,
    emptyText,
    isLoading,
    mode,
  }: {
    items: Article[];
    emptyText: string;
    isLoading: boolean;
    mode: "pending" | "published";
  }) =>
    isLoading ? (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-card/60 animate-pulse" />
        ))}
      </div>
    ) : items.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground text-sm">{emptyText}</div>
    ) : (
      <div className="space-y-3">
        {items.map((a) => (
          <ArticleCard
            key={a.id}
            article={a}
            mode={mode}
            onPreview={() => setPreviewing(a)}
            onEdit={() => openEdit(a)}
            onApprove={() => approve(a)}
            onReject={() => reject(a)}
            onUnpublish={() => unpublish(a)}
            onDelete={() => remove(a)}
            approving={approvingId === a.id}
            busy={rowBusyId === a.id}
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="w-full flex flex-row flex-nowrap items-center gap-3 overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-lg bg-gold/10 ring-1 ring-gold/30 shrink-0">
            <Newspaper className="h-5 w-5 text-gold" />
          </div>
          <div className="shrink-0">
            <h1 className="font-display text-2xl font-bold text-gradient-gold whitespace-nowrap">ניהול חדשות</h1>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              סקירה ואישור של כתבות PR מהקהילה וכתבות אוטומטיות מהעולם
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          size="lg"
          className="bg-gold text-gold-foreground hover:bg-gold/90 shadow-lg shadow-gold/20 font-semibold shrink-0 whitespace-nowrap"
        >
          <Plus className="h-5 w-5 ml-1" />
          ➕ הוסף כתבה חדשה ידנית
        </Button>
      </div>

      <Tabs defaultValue="published">
        <TabsList className="flex w-full flex-row flex-nowrap justify-start gap-1">
          <TabsTrigger value="published" className="gap-2">
            <Globe className="h-4 w-4" />
            כתבות מפורסמות
            {publishedArticles.length > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ml-1">
                {publishedArticles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pr" className="gap-2">
            <Megaphone className="h-4 w-4" />
            בקשות PR
            {prArticles.length > 0 && (
              <Badge className="bg-gold text-gold-foreground ml-1">{prArticles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            AI ממתינות
            {aiArticles.length > 0 && (
              <Badge className="bg-gold text-gold-foreground ml-1">{aiArticles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-2">
            <Sparkles className="h-4 w-4" />
            מנוע תוכן AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="mt-5 space-y-4">
          <div className="w-full flex flex-row flex-nowrap items-center gap-3 overflow-x-auto touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="relative shrink-0 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={publishedSearch}
                onChange={(e) => setPublishedSearch(e.target.value)}
                placeholder="חיפוש בכותרות ותקצירים..."
                className="pr-9 bg-background/60 border-gold/20"
              />
            </div>
            <Select value={publishedCategory} onValueChange={setPublishedCategory}>
              <SelectTrigger className="w-56 shrink-0 bg-background/60 border-gold/20">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {knownCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c] ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {filteredPublished.length} מתוך {publishedArticles.length}
            </div>
          </div>
          <Section
            items={filteredPublished}
            emptyText={
              publishedArticles.length === 0
                ? "עדיין אין כתבות מפורסמות."
                : "אין תוצאות לחיפוש זה."
            }
            isLoading={loadingPublished}
            mode="published"
          />
        </TabsContent>

        <TabsContent value="pr" className="mt-5">
          <Section
            items={prArticles}
            emptyText="אין כרגע בקשות פרסום ממתינות."
            isLoading={loading}
            mode="pending"
          />
        </TabsContent>
        <TabsContent value="ai" className="mt-5">
          <Section
            items={aiArticles}
            emptyText="אין כרגע כתבות אוטומטיות ממתינות לאישור."
            isLoading={loading}
            mode="pending"
          />
        </TabsContent>
        <TabsContent value="engine" className="mt-5 space-y-6">
          <AIPendingQueue />
          <NewsSourcesManager />
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold font-display text-xl">
              {previewing?.title}
            </DialogTitle>
          </DialogHeader>
          {previewing?.image_url && (
            <img
              src={previewing.image_url}
              alt=""
              className="w-full max-h-72 object-cover rounded-lg ring-1 ring-gold/20"
            />
          )}
          {previewing?.summary && (
            <p className="text-muted-foreground italic border-r-2 border-gold/40 pr-3">
              {previewing.summary}
            </p>
          )}
          <div
            className="prose prose-invert max-w-none prose-headings:text-gold prose-strong:text-gold prose-a:text-gold"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewing?.content ?? "") }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold">עריכת כתבה</DialogTitle>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">קטגוריה (ניתן להקליד חדשה)</Label>
                <Input
                  list="news-edit-category-options"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  maxLength={60}
                  className="mt-1 bg-background/60 border-gold/20"
                />
                <datalist id="news-edit-category-options">
                  {knownCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="text-sm">תמונת שער (URL)</Label>
                <Input
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  maxLength={500}
                  className="mt-1 bg-background/60 border-gold/20"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">תקציר</Label>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 bg-background/60 border-gold/20 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm">תוכן</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={14}
                className="mt-1 bg-background/60 border-gold/20 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)} className="w-full sm:w-auto">
              ביטול
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-gold text-gold-foreground hover:bg-gold/90 w-full sm:w-auto"
            >
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create new article dialog (admin instant publish) */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); resetCreate(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold">כתבה חדשה — פרסום מיידי</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">כותרת *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={180}
                className="mt-1 bg-background/60 border-gold/20"
                placeholder="כותרת הכתבה"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">קטגוריה *</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="mt-1 bg-background/60 border-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">כתובת תמונת שער (URL)</Label>
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  maxLength={500}
                  className="mt-1 bg-background/60 border-gold/20"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">תקציר</Label>
              <Textarea
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 bg-background/60 border-gold/20 resize-none"
                placeholder="2-3 משפטים שיוצגו בכרטיס המגזין"
              />
            </div>
            <div>
              <Label className="text-sm">תוכן (HTML בסיסי נתמך) *</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={14}
                maxLength={50000}
                className="mt-1 bg-background/60 border-gold/20 font-mono text-sm"
                placeholder="<h2>כותרת</h2><p>פסקה...</p>"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreate(); }} className="w-full sm:w-auto">
              ביטול
            </Button>
            <Button
              onClick={createArticle}
              disabled={creating}
              className="bg-gold text-gold-foreground hover:bg-gold/90 w-full sm:w-auto"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              פרסם עכשיו
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
