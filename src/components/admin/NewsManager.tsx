import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { sanitizeHtml } from "@/lib/sanitize";
import { Newspaper, Eye, Pencil, Check, Bot, Megaphone, Loader2, X, Plus } from "lucide-react";
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
  onPreview,
  onEdit,
  onApprove,
  onReject,
  approving,
}: {
  article: Article;
  onPreview: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
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
            ערוך טקסט
          </Button>
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
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5 ml-1" />
            דחה
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NewsManager() {
  const [prArticles, setPrArticles] = useState<Article[]>([]);
  const [aiArticles, setAiArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [previewing, setPreviewing] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
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

  useEffect(() => {
    load();
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

  const openEdit = (a: Article) => {
    setEditing(a);
    setEditTitle(a.title);
    setEditSummary(a.summary ?? "");
    setEditContent(a.content);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const { error } = await (supabase as any)
      .from("music_news")
      .update({
        title: editTitle,
        summary: editSummary || null,
        content: editContent,
      })
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) {
      toast.error("שמירה נכשלה");
      return;
    }
    toast.success("הטקסט עודכן");
    const patch = (arr: Article[]) =>
      arr.map((a) =>
        a.id === editing.id ? { ...a, title: editTitle, summary: editSummary, content: editContent } : a,
      );
    setPrArticles(patch);
    setAiArticles(patch);
    setEditing(null);
  };

  const Section = ({
    items,
    emptyText,
  }: {
    items: Article[];
    emptyText: string;
  }) =>
    loading ? (
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
            onPreview={() => setPreviewing(a)}
            onEdit={() => openEdit(a)}
            onApprove={() => approve(a)}
            onReject={() => reject(a)}
            approving={approvingId === a.id}
          />
        ))}
      </div>
    );

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gold/10 ring-1 ring-gold/30">
          <Newspaper className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold">ניהול חדשות</h1>
          <p className="text-sm text-muted-foreground">
            סקירה ואישור של כתבות PR מהקהילה וכתבות אוטומטיות מהעולם
          </p>
        </div>
      </div>

      <Tabs defaultValue="pr" dir="rtl">
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 gap-1">
          <TabsTrigger value="pr" className="gap-2">
            <Megaphone className="h-4 w-4" />
            בקשות פרסום (PR)
            {prArticles.length > 0 && (
              <Badge className="bg-gold text-gold-foreground ml-1">{prArticles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            חדשות מהעולם (AI Ingest)
            {aiArticles.length > 0 && (
              <Badge className="bg-gold text-gold-foreground ml-1">{aiArticles.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pr" className="mt-5">
          <Section items={prArticles} emptyText="אין כרגע בקשות פרסום ממתינות." />
        </TabsContent>
        <TabsContent value="ai" className="mt-5">
          <Section
            items={aiArticles}
            emptyText="אין כרגע כתבות אוטומטיות ממתינות לאישור."
          />
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent dir="rtl" className="max-w-3xl">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ביטול
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
