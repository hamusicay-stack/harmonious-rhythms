import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, Music2, Sliders, User, Library, TrendingUp, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/wiki/")({
  head: () => ({
    meta: [
      { title: "ויזיקאי — האנציקלופדיה של המוזיקאי | המוזיקאי" },
      { name: "description", content: "ויזיקאי — מאגר הידע המוזיקלי של הקהילה: כלי נגינה, טכנולוגיית סאונד, אמנים ותיאוריה." },
      { property: "og:title", content: "ויזיקאי — האנציקלופדיה של המוזיקאי" },
      { property: "og:description", content: "חפש מושג, כלי או אמן. הכל במקום אחד." },
    ],
  }),
  component: WikiIndexPage,
});

type WikiRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  category: "instruments" | "audio_tech" | "artists" | "music_theory";
  views_count: number | null;
  created_at: string;
};

const CATEGORIES: Array<{
  key: WikiRow["category"];
  emoji: string;
  title: string;
  desc: string;
  icon: typeof Music2;
}> = [
  { key: "instruments", emoji: "🎹", title: "כלי נגינה וחומרה", desc: "פסנתרים, סינתים, גיטרות וקלידים", icon: Music2 },
  { key: "audio_tech", emoji: "🎛️", title: "טכנולוגיית סאונד והפקה", desc: "מיקסרים, פלאגינים, ממשקים ואולפנים", icon: Sliders },
  { key: "artists", emoji: "👤", title: "אמנים ויוצרים", desc: "ביוגרפיות ומורשת מוזיקלית", icon: User },
  { key: "music_theory", emoji: "🎼", title: "תיאוריית המוזיקה", desc: "סולמות, אקורדים, הרמוניה וצורות", icon: Library },
];

const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=70";

function slugifyWiki(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `${base || "article"}-${Math.random().toString(36).slice(2, 7)}`;
}

function WikiIndexPage() {
  const [rows, setRows] = useState<WikiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Create new article state
  const [openCreate, setOpenCreate] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nCategory, setNCategory] = useState<WikiRow["category"]>("instruments");
  const [nSummary, setNSummary] = useState("");
  const [nContent, setNContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const submitNew = async () => {
    if (!userId) {
      toast.error("שגיאה בשמירה. ודא שאתה מחובר למערכת.");
      return;
    }
    if (nTitle.trim().length < 2 || nContent.trim().length < 20) {
      toast.error("נא למלא כותרת ותוכן מספק");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("wiki_articles").insert({
        title: nTitle.trim(),
        slug: slugifyWiki(nTitle),
        category: nCategory,
        summary: nSummary.trim() || null,
        content: nContent.trim(),
        created_by: userId,
        last_edited_by: userId,
        is_verified: false,
      });
      if (error) throw error;
      toast.success("נשמר בהצלחה! ✅ הערך יעלה לאחר בדיקת מערכת");
      setOpenCreate(false);
      setNTitle(""); setNSummary(""); setNContent(""); setNCategory("instruments");
    } catch (e: any) {
      toast.error(friendlyError(e, "שגיאה בשמירה. ודא שאתה מחובר למערכת."));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("wiki_articles")
        .select("id,title,slug,summary,image_url,category,views_count,created_at")
        .eq("is_verified", true)
        .order("views_count", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setRows((data ?? []) as WikiRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trending = useMemo(() => rows.slice(0, 8), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (letter && !r.title.startsWith(letter)) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, letter]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative border-b border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-background to-background">
        <div className="container mx-auto px-4 py-14 md:py-20 text-center">
          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-4">
            <BookOpen className="h-3.5 w-3.5 ml-1" />
            ויזיקאי · האנציקלופדיה של המוזיקאי
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-3">
            מאגר הידע <span className="text-amber-400">המוזיקלי</span> של הקהילה
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            כל מה שצריך לדעת — כלי נגינה, טכנולוגיה, אמנים ותיאוריה. במקום אחד.
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400/70" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש מושג, כלי או אמן..."
              className="h-14 pr-12 text-lg bg-card border-amber-500/30 focus-visible:ring-amber-500/40"
            />
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setOpenCreate(true)}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              <FileText className="h-4 w-4 ml-1" />
              📄 הצע ערך חדש
            </Button>
          </div>

          {/* Alphabet selector */}
          <div className="mt-6 flex flex-wrap justify-center gap-1.5">
            <Button
              size="sm"
              variant={letter === null ? "default" : "outline"}
              onClick={() => setLetter(null)}
              className={letter === null ? "bg-amber-500 text-black hover:bg-amber-400" : "border-amber-500/30 text-amber-200 hover:bg-amber-500/10"}
            >
              הכל
            </Button>
            {HEBREW_LETTERS.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={letter === l ? "default" : "outline"}
                onClick={() => setLetter(letter === l ? null : l)}
                className={`min-w-[40px] min-h-[40px] ${
                  letter === l
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "border-amber-500/20 text-amber-200/80 hover:bg-amber-500/10"
                }`}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-14">
        {/* Categories */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2">
            <span className="text-amber-400">קטגוריות מרכזיות</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const count = rows.filter((r) => r.category === cat.key).length;
              return (
                <Link
                  key={cat.key}
                  to="/wiki"
                  search={{}}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("wiki-results")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-card p-6 hover:border-amber-400/60 hover:shadow-[0_0_30px_-10px_rgba(212,175,55,0.4)] transition-all"
                >
                  <div className="text-4xl mb-3">{cat.emoji}</div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-amber-300 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{cat.desc}</p>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                    {count} ערכים
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-amber-400" />
              הערכים הנקראים ביותר השבוע
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trending.map((r, i) => (
                <Link
                  key={r.id}
                  to="/wiki/$slug"
                  params={{ slug: r.slug }}
                  className="group flex items-center gap-3 rounded-lg border border-amber-500/15 bg-card p-3 hover:border-amber-400/50 transition-all"
                >
                  <div className="text-amber-400 font-bold text-xl w-6">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate group-hover:text-amber-300 transition-colors">
                      {r.title}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {(r.views_count ?? 0).toLocaleString("he-IL")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        <section id="wiki-results">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {query || letter ? "תוצאות חיפוש" : "כל הערכים"}
            <span className="text-muted-foreground text-base font-normal mr-3">({filtered.length})</span>
          </h2>
          {loading ? (
            <div className="text-center text-muted-foreground py-12">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border border-dashed border-amber-500/20 rounded-xl">
              לא נמצאו ערכים. נסה חיפוש אחר או הצע ערך חדש.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  to="/wiki/$slug"
                  params={{ slug: r.slug }}
                  className="group rounded-xl overflow-hidden border border-amber-500/15 bg-card hover:border-amber-400/50 hover:shadow-[0_0_30px_-15px_rgba(212,175,55,0.5)] transition-all"
                >
                  <div className="aspect-video overflow-hidden bg-muted/30">
                    <img
                      src={r.image_url || FALLBACK_IMAGE}
                      alt={r.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <Badge variant="outline" className="mb-2 border-amber-500/30 text-amber-300 text-xs">
                      {CATEGORIES.find((c) => c.key === r.category)?.title ?? r.category}
                    </Badge>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-amber-300 transition-colors line-clamp-1">
                      {r.title}
                    </h3>
                    {r.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.summary}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create new wiki article dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent dir="rtl" className="bg-card border-amber-500/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-300">הצעת ערך חדש לוויזיקאי</DialogTitle>
            <DialogDescription>
              הערך יישלח לבדיקת מערכת לפני שיופיע בפומבי באנציקלופדיה.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">כותרת *</Label>
              <Input
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                maxLength={180}
                placeholder="לדוגמה: Korg Pa5X"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">קטגוריה *</Label>
              <Select value={nCategory} onValueChange={(v) => setNCategory(v as WikiRow["category"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.emoji} {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">תקציר</Label>
              <Textarea
                value={nSummary}
                onChange={(e) => setNSummary(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="משפט-שניים שמסכמים את הערך"
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm">תוכן הערך *</Label>
              <Textarea
                value={nContent}
                onChange={(e) => setNContent(e.target.value)}
                rows={12}
                maxLength={50000}
                placeholder="ניתן להשתמש ב-Markdown (## כותרת) או HTML בסיסי"
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>ביטול</Button>
            <Button
              onClick={submitNew}
              disabled={submitting || !userId}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {submitting ? "שולח..." : "שלח לבדיקה"}
            </Button>
          </DialogFooter>
          {!userId && (
            <p className="text-xs text-muted-foreground text-center">יש להתחבר כדי להציע ערך חדש.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
