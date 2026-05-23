import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "אודות — המוזיקאי" },
      { name: "description", content: "המשימה שלנו: לבנות בית לכל מוזיקאי — מקצועי, יוקרתי וקהילתי." },
      { property: "og:title", content: "אודות — המוזיקאי" },
      { property: "og:description", content: "המשימה שלנו: לבנות בית לכל מוזיקאי — מקצועי, יוקרתי וקהילתי." },
    ],
  }),
  component: AboutPage,
});

const FALLBACK_HTML =
  '<h1>אודות הפלטפורמה</h1><p>ברוכים הבאים לאקו-סיסטם המוביל למוזיקאים בישראל. אנו מחברים בין נגנים, מורים, תלמידים ומפיקים תחת קורת גג אחת.</p>';
const FALLBACK_FAQ = [
  { q: "מה זו הפלטפורמה?", a: "בית דיגיטלי יוקרתי לכל מוזיקאי — פורום, חנות, אקדמיה ושוק יד-שנייה." },
  { q: "איך מצטרפים?", a: "פשוט נרשמים בחינם ומתחילים לתרום, ללמוד ולמכור." },
];

type FaqItem = { q: string; a: string };

function splitContent(html: string): { body: string; faq: FaqItem[] } {
  if (typeof window === "undefined" || !html) return { body: html, faq: [] };
  try {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const faqRoot = tpl.content.querySelector('[data-faq="true"]');
    const faq: FaqItem[] = [];
    if (faqRoot) {
      faqRoot.querySelectorAll('[data-faq-item="true"]').forEach((el) => {
        const q = el.querySelector('[data-faq-q="true"]')?.textContent?.trim() ?? "";
        const a = el.querySelector('[data-faq-a="true"]')?.textContent?.trim() ?? "";
        if (q || a) faq.push({ q, a });
      });
      faqRoot.remove();
    }
    return { body: tpl.innerHTML.trim(), faq };
  } catch { return { body: html, faq: [] }; }
}

function AboutPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("site_pages")
          .select("content_html, is_published")
          .eq("slug", "about")
          .maybeSingle();
        if (error || !data || !data.is_published) { setErrored(true); return; }
        setHtml(data.content_html ?? "");
      } catch { setErrored(true); }
    })();
  }, []);

  const { body, faq } = useMemo(() => {
    if (errored || html === null) return { body: FALLBACK_HTML, faq: FALLBACK_FAQ };
    const parsed = splitContent(html);
    return { body: parsed.body || FALLBACK_HTML, faq: parsed.faq.length ? parsed.faq : [] };
  }, [html, errored]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16" dir="rtl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" /> אודות
        </div>

        <article
          className={cn(
            "prose prose-invert max-w-none",
            "prose-headings:font-display prose-headings:text-foreground",
            "prose-h1:bg-gradient-to-l prose-h1:from-primary prose-h1:to-foreground prose-h1:bg-clip-text prose-h1:text-transparent",
            "prose-h2:border-b prose-h2:border-primary/20 prose-h2:pb-2",
            "prose-p:text-muted-foreground prose-p:leading-relaxed",
            "prose-strong:text-foreground prose-a:text-primary",
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
        />

        {faq.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 font-display text-2xl font-bold text-foreground">שאלות נפוצות</h2>
            <div className="space-y-3">
              {faq.map((item, i) => <FaqRow key={i} q={item.q} a={item.a} defaultOpen={i === 0} />)}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="group overflow-hidden rounded-xl border border-primary/20 bg-card/40 backdrop-blur transition-all hover:border-primary/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-end transition-colors hover:bg-primary/5"
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-primary transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}
