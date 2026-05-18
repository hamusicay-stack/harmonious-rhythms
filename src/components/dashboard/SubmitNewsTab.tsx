import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Newspaper, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTED_CATEGORIES = [
  "סינגלים חדשים",
  "השקות אלבומים",
  "אירועים",
  "סיקורי ציוד",
  "ראיונות",
  "תוכנה ופלאגינים",
  "תעשיית המוזיקה",
];

const schema = z.object({
  title: z.string().trim().min(3, "כותרת חייבת להיות לפחות 3 תווים").max(180),
  category: z.string().trim().min(2, "יש לבחור או להזין קטגוריה").max(60),
  summary: z.string().trim().max(500).optional(),
  content: z.string().trim().min(20, "התוכן קצר מדי").max(50000),
  short_video_id: z.string().uuid().optional().or(z.literal("")),
});

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9א-ת\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${base || "article"}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SubmitNewsTab({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("סינגלים חדשים");
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("music_news")
        .select("category")
        .eq("approval_status", "approved")
        .limit(500);
      const uniq = Array.from(
        new Set([...(data ?? []).map((r: any) => r.category).filter(Boolean), ...SUGGESTED_CATEGORIES]),
      ) as string[];
      setExistingCategories(uniq);
    })();
  }, []);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [shortVideoId, setShortVideoId] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onPickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקס׳ 8MB)");
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setTitle("");
    setSummary("");
    setContent("");
    setShortVideoId("");
    setCoverFile(null);
    setCoverPreview(null);
    setCategory("singles");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || cooldown > 0) return;
    const parsed = schema.safeParse({
      title,
      category,
      summary: summary || undefined,
      content,
      short_video_id: shortVideoId || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "פרטים חסרים");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("news-covers")
          .upload(path, coverFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("news-covers").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error } = await (supabase as any).from("music_news").insert({
        title: parsed.data.title,
        slug: slugify(parsed.data.title),
        category: parsed.data.category,
        summary: parsed.data.summary ?? null,
        content: parsed.data.content,
        image_url: imageUrl,
        short_video_id: parsed.data.short_video_id || null,
        author_id: userId,
        submitted_by_pr: true,
        approval_status: "pending_review",
        is_automated: false,
      });
      if (error) throw error;

      toast.success("הכתבה נשלחה למערכת ותעלה לאחר אישור עורך קצר! 📄");
      reset();
      setCooldown(3);
    } catch (err: any) {
      console.error(err);
      toast.error(friendlyError(err, "שגיאה בשליחת הכתבה"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="rounded-xl border border-gold/20 bg-card/60 p-5 sm:p-7 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gold/10 ring-1 ring-gold/30">
          <Newspaper className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-gradient-gold">פרסם כתבה / סינגל</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            כל פרסום עובר בדיקת עורך קצרה לפני שעולה למגזין הציבורי
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label htmlFor="news-title" className="text-sm">
            כותרת <span className="text-gold">*</span>
          </Label>
          <Input
            id="news-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={180}
            placeholder="לדוגמה: הסינגל החדש של ההרכב 'אקורד פתוח' יוצא ביום שישי"
            className="mt-1.5 bg-background/60 border-gold/20 focus-visible:ring-gold/40"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">
              קטגוריה <span className="text-gold">*</span>
            </Label>
            <Input
              list="news-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={60}
              placeholder="בחר או הקלד קטגוריה חדשה"
              className="mt-1.5 bg-background/60 border-gold/20 focus-visible:ring-gold/40"
              required
            />
            <datalist id="news-category-options">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="short-id" className="text-sm">
              מזהה שורט קשור (אופציונלי)
            </Label>
            <Input
              id="short-id"
              value={shortVideoId}
              onChange={(e) => setShortVideoId(e.target.value)}
              placeholder="UUID של הסרטון"
              className="mt-1.5 bg-background/60 border-gold/20 focus-visible:ring-gold/40 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="news-summary" className="text-sm">
            תקציר קצר (יוצג בכרטיס המגזין)
          </Label>
          <Textarea
            id="news-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="2-3 משפטים שיתפסו את העין"
            className="mt-1.5 bg-background/60 border-gold/20 focus-visible:ring-gold/40 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">{summary.length}/500</p>
        </div>

        <div>
          <Label htmlFor="news-content" className="text-sm">
            תוכן הכתבה <span className="text-gold">*</span>
          </Label>
          <Textarea
            id="news-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            maxLength={50000}
            placeholder="ניתן להשתמש ב-HTML בסיסי: <h2>, <p>, <ul>, <strong>..."
            className="mt-1.5 bg-background/60 border-gold/20 focus-visible:ring-gold/40 font-mono text-sm leading-relaxed"
            required
          />
        </div>

        <div>
          <Label className="text-sm">תמונת שער</Label>
          <label className="mt-1.5 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold/30 bg-background/40 px-4 py-6 cursor-pointer hover:border-gold/60 hover:bg-gold/5 transition-colors">
            <Upload className="h-4 w-4 text-gold" />
            <span className="text-sm">{coverFile ? coverFile.name : "בחר תמונה (עד 8MB)"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={onPickCover}
              className="hidden"
            />
          </label>
          {coverPreview && (
            <img
              src={coverPreview}
              alt="תצוגה מקדימה"
              className="mt-3 max-h-48 w-full object-cover rounded-lg ring-1 ring-gold/20"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gold/10">
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={submitting}
            className="border-gold/30 hover:bg-gold/10"
          >
            איפוס
          </Button>
          <Button
            type="submit"
            disabled={submitting || cooldown > 0}
            className="bg-gold text-gold-foreground hover:bg-gold/90 min-w-[140px] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                שולח...
              </>
            ) : cooldown > 0 ? (
              `המתן ${cooldown}s...`
            ) : (
              "שלח לאישור"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
