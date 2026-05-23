import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { requireAdmin } from "@/lib/routeGuards";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Loader2, Save, Plus, Trash2, HelpCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/content/pages/$id")({
  beforeLoad: requireAdmin,
  component: PageEditor,
  head: () => ({ meta: [{ title: "עריכת דף | אדמין" }] }),
});

type FaqItem = { id: string; q: string; a: string };

function parseFaqAndBody(html: string): { body: string; faq: FaqItem[] } {
  if (typeof window === "undefined") return { body: html, faq: [] };
  try {
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    const faqRoot = tpl.content.querySelector('[data-faq="true"]');
    const faq: FaqItem[] = [];
    if (faqRoot) {
      faqRoot.querySelectorAll('[data-faq-item="true"]').forEach((el, i) => {
        const q = el.querySelector('[data-faq-q="true"]')?.textContent?.trim() ?? "";
        const a = el.querySelector('[data-faq-a="true"]')?.textContent?.trim() ?? "";
        if (q || a) faq.push({ id: `${Date.now()}-${i}`, q, a });
      });
      faqRoot.remove();
    }
    return { body: tpl.innerHTML.trim(), faq };
  } catch { return { body: html, faq: [] }; }
}

function buildFaqHtml(faq: FaqItem[]): string {
  if (!faq.length) return "";
  const items = faq.map(
    (f) => `<div data-faq-item="true"><strong data-faq-q="true">${escapeHtml(f.q)}</strong><p data-faq-a="true">${escapeHtml(f.a)}</p></div>`
  ).join("");
  return `<div data-faq="true">${items}</div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function PageEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [body, setBody] = useState("");
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("site_pages").select("*").eq("id", id).single();
      if (error || !data) { toast.error("דף לא נמצא"); navigate({ to: "/admin/content/pages" }); return; }
      setTitle(data.title);
      setSlug(data.slug);
      setIsPublished(data.is_published);
      const parsed = parseFaqAndBody(data.content_html ?? "");
      setBody(parsed.body);
      setFaq(parsed.faq);
      setLoading(false);
    })();
  }, [id]);

  const addFaq = () => setFaq((p) => [...p, { id: `${Date.now()}`, q: "", a: "" }]);
  const removeFaq = (fid: string) => setFaq((p) => p.filter((f) => f.id !== fid));
  const updateFaq = (fid: string, patch: Partial<FaqItem>) =>
    setFaq((p) => p.map((f) => (f.id === fid ? { ...f, ...patch } : f)));

  const finalHtml = useMemo(() => (body ?? "") + buildFaqHtml(faq.filter((f) => f.q || f.a)), [body, faq]);

  const save = async () => {
    if (!title.trim() || !slug.trim()) { toast.error("כותרת ו-slug חובה"); return; }
    if (reason.trim().length < 3) { toast.error("יש לציין סיבה לשמירה (לפחות 3 תווים)"); return; }
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_save_site_page", {
      p_id: id, p_title: title.trim(), p_slug: slug.trim(),
      p_content_html: finalHtml, p_is_published: isPublished, p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר ונרשם באודיט");
    setReason("");
  };

  if (loading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/admin/content/pages" className="text-sm text-muted-foreground hover:underline">← כל הדפים</Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">עריכת דף</h1>
          </div>
          <Button asChild size="sm" variant="ghost">
            <a href={`/${slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-1 h-4 w-4" />תצוגה מקדימה</a>
          </Button>
        </div>

        <Card className="border-primary/20">
          <CardHeader><CardTitle className="text-base">פרטי הדף</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>כותרת</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>מזהה (slug)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} id="pub" />
              <Label htmlFor="pub">פורסם לציבור</Label>
              <Badge variant={isPublished ? "default" : "secondary"}>{isPublished ? "Live" : "Draft"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader><CardTitle className="text-base">תוכן עשיר</CardTitle></CardHeader>
          <CardContent>
            <RichTextEditor value={body} onChange={setBody} rows={14} />
            <p className="mt-2 text-xs text-muted-foreground">כותרות H1-H3, מודגש, רשימות, קישורים — שמורים כ-HTML נקי.</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-primary" /> בונה שאלות ותשובות (FAQ)
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addFaq}><Plus className="me-1 h-4 w-4" /> שאלה</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {faq.length === 0 && <p className="text-sm text-muted-foreground">אין שאלות. הוסף שאלה ראשונה.</p>}
            {faq.map((f, i) => (
              <div key={f.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeFaq(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Input placeholder="שאלה" value={f.q} onChange={(e) => updateFaq(f.id, { q: e.target.value })} />
                <Textarea placeholder="תשובה" value={f.a} onChange={(e) => updateFaq(f.id, { a: e.target.value })} rows={3} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardHeader><CardTitle className="text-base">שמירה ואודיט</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>סיבת השמירה (נרשמת ב-system_audit_logs)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="לדוגמה: עדכון טקסט מבוא ו-FAQ חדש" />
            <Button onClick={save} disabled={saving} className="w-full md:w-auto">
              {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
              שמור שינויים
            </Button>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
