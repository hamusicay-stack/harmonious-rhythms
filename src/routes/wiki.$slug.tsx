import { createFileRoute, Link } from "@tanstack/react-router";
import { sanitizeHtml } from "@/lib/sanitize";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Edit3, Eye, ShoppingBag, Tag, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/wiki/$slug")({
  component: WikiArticlePage,
});

type WikiArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category: "instruments" | "audio_tech" | "artists" | "music_theory";
  image_url: string | null;
  views_count: number | null;
  related_product_id: string | null;
  related_gear_keywords: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_edited_by: string | null;
};

type RelatedProduct = { id: string; name: string; slug: string; price: number | null; image_url: string | null };
type RelatedListing = { id: string; title: string; price: number | null; cover_image_url: string | null; city: string | null };

const CATEGORY_LABELS: Record<WikiArticle["category"], string> = {
  instruments: "כלי נגינה וחומרה",
  audio_tech: "טכנולוגיית סאונד והפקה",
  artists: "אמנים ויוצרים",
  music_theory: "תיאוריית המוזיקה",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1600&q=70";

/**
 * Parse content into sections by markdown-style headings (## / #) OR HTML <h2>/<h1>.
 * Returns the list of headings for the TOC and the rendered HTML body.
 */
function useArticleRender(content: string) {
  return useMemo(() => {
    const sections: Array<{ id: string; text: string; level: number }> = [];

    // If looks like HTML — inject ids into h1/h2/h3
    const hasHtml = /<h[1-3][\s>]/i.test(content);
    let bodyHtml = "";

    if (hasHtml) {
      bodyHtml = content.replace(/<(h[1-3])(\s[^>]*)?>(.*?)<\/\1>/gi, (_m, tag, _attrs, inner) => {
        const text = inner.replace(/<[^>]+>/g, "").trim();
        const id = "sec-" + sections.length + "-" + text.replace(/\s+/g, "-").slice(0, 40);
        const level = parseInt(tag.substring(1), 10);
        sections.push({ id, text, level });
        return `<${tag} id="${id}">${inner}</${tag}>`;
      });
    } else {
      // Markdown-lite: ## heading / # heading + paragraphs
      const lines = content.split(/\r?\n/);
      const out: string[] = [];
      let paraBuf: string[] = [];
      const flushPara = () => {
        if (paraBuf.length) {
          out.push(`<p>${paraBuf.join(" ").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`);
          paraBuf = [];
        }
      };
      for (const line of lines) {
        const t = line.trim();
        const m = /^(#{1,3})\s+(.+)/.exec(t);
        if (m) {
          flushPara();
          const level = m[1].length;
          const text = m[2].trim();
          const id = "sec-" + sections.length + "-" + text.replace(/\s+/g, "-").slice(0, 40);
          sections.push({ id, text, level });
          out.push(`<h${level} id="${id}">${text}</h${level}>`);
        } else if (!t) {
          flushPara();
        } else {
          paraBuf.push(t);
        }
      }
      flushPara();
      bodyHtml = out.join("\n");
    }

    return { sections, bodyHtml };
  }, [content]);
}

function WikiArticlePage() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<RelatedProduct | null>(null);
  const [listings, setListings] = useState<RelatedListing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openProposal, setOpenProposal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalBody, setProposalBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const incrementedRef = useRef(false);

  // Edit existing article
  const [openEdit, setOpenEdit] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eSummary, setESummary] = useState("");
  const [eContent, setEContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditDialog = () => {
    if (!article) return;
    setETitle(article.title);
    setESummary(article.summary ?? "");
    setEContent(article.content);
    setOpenEdit(true);
  };

  const saveEditArticle = async () => {
    if (!article) return;
    if (!userId) {
      toast.error("שגיאה בשמירה. ודא שאתה מחובר למערכת.");
      return;
    }
    if (!eTitle.trim() || eContent.trim().length < 20) {
      toast.error("נא למלא כותרת ותוכן");
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await (supabase as any)
        .from("wiki_articles")
        .update({
          title: eTitle.trim(),
          summary: eSummary.trim() || null,
          content: eContent.trim(),
          last_edited_by: userId,
        })
        .eq("id", article.id);
      if (error) throw error;
      toast.success("נשמר בהצלחה! ✅");
      setArticle({ ...article, title: eTitle.trim(), summary: eSummary.trim() || null, content: eContent.trim(), last_edited_by: userId });
      setOpenEdit(false);
    } catch (e: any) {
      toast.error(friendlyError(e, "שגיאה בשמירה. ודא שאתה מחובר למערכת."));
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("wiki_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_verified", true)
        .maybeSingle();
      if (cancelled) return;
      setArticle((data as WikiArticle) ?? null);
      setLoading(false);

      if (data && !incrementedRef.current) {
        incrementedRef.current = true;
        (supabase as any)
          .from("wiki_articles")
          .update({ views_count: (data.views_count ?? 0) + 1 })
          .eq("id", data.id)
          .then(() => {});
      }

      if (data?.related_product_id) {
        const { data: p } = await (supabase as any)
          .from("shop_products")
          .select("id,name,slug,price,image_url")
          .eq("id", data.related_product_id)
          .maybeSingle();
        if (!cancelled) setProduct((p as RelatedProduct) ?? null);
      }

      if (data?.related_gear_keywords?.length) {
        const orFilter = (data.related_gear_keywords as string[])
          .slice(0, 6)
          .map((k) => `title.ilike.%${k}%`)
          .join(",");
        const { data: ls } = await (supabase as any)
          .from("marketplace_listings")
          .select("id,title,price,cover_image_url,city")
          .eq("status", "approved")
          .eq("is_sold", false)
          .or(orFilter)
          .limit(3);
        if (!cancelled) setListings((ls ?? []) as RelatedListing[]);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const { sections, bodyHtml } = useArticleRender(article?.content ?? "");

  // Active TOC tracking
  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections, bodyHtml]);

  const submitProposal = async () => {
    if (!userId) {
      toast.error("יש להתחבר כדי להציע עריכה");
      return;
    }
    if (!proposalTitle.trim() || !proposalBody.trim()) {
      toast.error("נא למלא כותרת ותוכן");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("wiki_articles").insert({
        title: proposalTitle.trim(),
        slug:
          proposalTitle
            .trim()
            .toLowerCase()
            .replace(/[^\w\u0590-\u05FF]+/g, "-")
            .replace(/^-+|-+$/g, "") +
          "-" + Math.random().toString(36).slice(2, 7),
        content: proposalBody.trim(),
        summary: `הצעה למאמר חדש מאת הקהילה (קשור ל-${article?.title ?? "ערך"})`,
        category: article?.category ?? "instruments",
        created_by: userId,
        last_edited_by: userId,
        is_verified: false,
      });
      if (error) throw error;
      toast.success("ההצעה נשלחה לבדיקה — תודה על התרומה לקהילה 🙏");
      setOpenProposal(false);
      setProposalTitle("");
      setProposalBody("");
    } catch (e: any) {
      toast.error(e?.message || "שליחת ההצעה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        טוען ערך...
      </div>
    );
  }

  if (!article) {
    return (
      <div dir="rtl" className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">הערך לא נמצא</h1>
        <Link to="/wiki" className="text-amber-400 hover:underline">חזרה לוויזיקאי</Link>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Header banner */}
      <div className="relative w-full h-64 md:h-96 overflow-hidden border-b border-amber-500/20">
        <img src={article.image_url || FALLBACK_IMAGE} alt={article.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-x-0 bottom-0 container mx-auto px-4 pb-6">
          <Link to="/wiki" className="inline-flex items-center gap-1 text-amber-300/90 hover:text-amber-300 mb-3 text-sm">
            <ArrowRight className="h-4 w-4" />
            חזרה לוויזיקאי
          </Link>
          <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            <BookOpen className="h-3.5 w-3.5 ml-1" />
            {CATEGORY_LABELS[article.category]}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg">{article.title}</h1>
          {article.summary && (
            <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-3xl">{article.summary}</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {(article.views_count ?? 0).toLocaleString("he-IL")} צפיות
            </span>
            {userId && (
              <Button
                size="sm"
                onClick={openEditDialog}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                <Edit3 className="h-4 w-4 ml-1" />
                ✏️ ערוך ערך זה
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
        {/* Body */}
        <article className="min-w-0">
          <div
            className="
              prose prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-bold
              prose-h1:text-3xl prose-h1:border-b prose-h1:border-amber-500/30 prose-h1:pb-2
              prose-h2:text-2xl prose-h2:border-b prose-h2:border-amber-500/20 prose-h2:pb-2 prose-h2:mt-10
              prose-h3:text-xl prose-h3:text-amber-200
              prose-p:leading-relaxed prose-p:text-foreground/90
              prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-amber-200
              prose-li:marker:text-amber-400
            "
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
          />

          {/* Conversion footers */}
          <div className="mt-12 space-y-6">
            {product && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-card p-6 flex flex-col md:flex-row items-center gap-5">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="w-32 h-32 object-cover rounded-xl border border-amber-500/30" />
                )}
                <div className="flex-1 text-center md:text-right">
                  <div className="text-amber-300 text-sm mb-1">🛒 מחפש את הציוד הזה?</div>
                  <h3 className="text-xl font-bold">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    רכוש כעת דגם חדש ומקורי בחנות הרשמית במחיר מיוחד
                  </p>
                  {product.price != null && (
                    <div className="text-2xl font-bold text-amber-400 mt-2">
                      ₪{Number(product.price).toLocaleString("he-IL")}
                    </div>
                  )}
                </div>
                <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                  <Link to="/shop/$slug" params={{ slug: product.slug }}>
                    <ShoppingBag className="h-4 w-4 ml-1" />
                    לרכישה בחנות
                  </Link>
                </Button>
              </div>
            )}

            {listings.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-card p-6">
                <h3 className="text-lg font-bold mb-1">🎸 מציאות מלוח יד-2</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  מצא {article.title} משומש בקהילה — במחיר אטרקטיבי
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {listings.map((l) => (
                    <Link
                      key={l.id}
                      to="/marketplace/$listingId"
                      params={{ listingId: l.id }}
                      className="group rounded-xl overflow-hidden border border-amber-500/15 hover:border-amber-400/50 transition-all bg-background"
                    >
                      <div className="aspect-video overflow-hidden bg-muted/30">
                        <img
                          src={l.cover_image_url || FALLBACK_IMAGE}
                          alt={l.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-3">
                        <div className="font-semibold text-sm line-clamp-1 group-hover:text-amber-300 transition-colors">
                          {l.title}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-amber-400 font-bold">
                            {l.price != null ? `₪${Number(l.price).toLocaleString("he-IL")}` : "—"}
                          </span>
                          {l.city && <span className="text-xs text-muted-foreground">{l.city}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {article.related_gear_keywords?.length ? (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <Tag className="h-4 w-4 text-amber-400" />
                {article.related_gear_keywords.map((k) => (
                  <Badge key={k} variant="outline" className="border-amber-500/30 text-amber-200">
                    {k}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Proposal CTA */}
            <div className="rounded-2xl border border-dashed border-amber-500/30 bg-card/50 p-6 text-center">
              <h3 className="text-lg font-bold mb-1">תרום לקהילת הידע</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ראית טעות? חסר ערך? עזור לנו לבנות את האנציקלופדיה השלמה של המוזיקאי הישראלי.
              </p>
              <Dialog open={openProposal} onOpenChange={setOpenProposal}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 text-black hover:bg-amber-400">
                    <Edit3 className="h-4 w-4 ml-1" />
                    📄 הצע עריכה או ערך חדש
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl" className="bg-card border-amber-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-amber-300">הצעה לערך חדש / עריכה</DialogTitle>
                    <DialogDescription>
                      ההצעה תישלח לבדיקת המערכת לפני פרסום פומבי.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">כותרת הערך</label>
                      <Input
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                        placeholder="לדוגמה: Korg Pa5X"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">תוכן / עריכה מוצעת</label>
                      <Textarea
                        rows={8}
                        value={proposalBody}
                        onChange={(e) => setProposalBody(e.target.value)}
                        placeholder="ספר על הערך — היסטוריה, מפרטים, חשיבות..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenProposal(false)}>ביטול</Button>
                    <Button
                      onClick={submitProposal}
                      disabled={submitting || !userId}
                      className="bg-amber-500 text-black hover:bg-amber-400"
                    >
                      {submitting ? "שולח..." : "שלח הצעה"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {!userId && (
                <p className="text-xs text-muted-foreground mt-3">
                  יש להתחבר כדי להציע עריכות.
                </p>
              )}
            </div>
          </div>
        </article>

        {/* TOC Sidebar */}
        {sections.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-amber-500/20 bg-card p-4">
              <div className="flex items-center gap-2 mb-3 text-amber-300 font-bold">
                <List className="h-4 w-4" />
                תוכן עניינים
              </div>
              <nav className="space-y-1 text-sm max-h-[70vh] overflow-y-auto pr-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`block border-r-2 pr-3 py-1 transition-colors ${
                      activeId === s.id
                        ? "border-amber-400 text-amber-300 font-medium"
                        : "border-transparent text-muted-foreground hover:text-amber-200 hover:border-amber-500/40"
                    } ${s.level === 3 ? "pr-6 text-xs" : ""}`}
                  >
                    {s.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
