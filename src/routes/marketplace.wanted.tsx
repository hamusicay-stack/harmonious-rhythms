import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Search, Plus, Loader2, ArrowRight, MapPin, Wallet, MessageCircle } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/wanted")({
  head: () => ({
    meta: [
      { title: "מבוקש לקנייה — לוח דרושים | המוזיקאי" },
      { name: "description", content: "לוח 'מבוקש לקנייה' (WTB) — קונים מחפשים כלי נגינה, ציוד אולפן ומקלדות. מוצא התאמה? שלח הצעה ישירות." },
      { property: "og:title", content: "מבוקש לקנייה — לוח דרושים | המוזיקאי" },
      { property: "og:description", content: "קונים מפרסמים מה הם מחפשים. מוכרים יוצרים קשר ישיר." },
    ],
  }),
  component: WantedBoardPage,
});

type Wanted = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
};
type Buyer = { id: string; display_name: string | null; avatar_url: string | null };

const FormSchema = z.object({
  title: z.string().trim().min(3, "כותרת קצרה מדי").max(200),
  description: z.string().trim().min(5, "תיאור קצר מדי").max(4000),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  budget_min: z.number().nonnegative().optional(),
  budget_max: z.number().nonnegative().optional(),
});

function formatBudget(min: number | null, max: number | null) {
  if (min && max) return `₪${min.toLocaleString()} - ₪${max.toLocaleString()}`;
  if (min) return `מעל ₪${min.toLocaleString()}`;
  if (max) return `עד ₪${max.toLocaleString()}`;
  return "תקציב גמיש";
}

function WantedBoardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Wanted[]>([]);
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "", brand: "", model: "", budget_min: "", budget_max: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_wanted")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data ?? []) as Wanted[];
    setItems(list);
    if (list.length > 0) {
      const ids = Array.from(new Set(list.map((w) => w.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const map: Record<string, Buyer> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setBuyers(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר כדי לפרסם בקשה"); return; }
    const parsed = FormSchema.safeParse({
      title: form.title,
      description: form.description,
      category: form.category || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "קלט לא תקין"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("marketplace_wanted").insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category ?? null,
      brand: parsed.data.brand ?? null,
      model: parsed.data.model ?? null,
      budget_min: parsed.data.budget_min ?? null,
      budget_max: parsed.data.budget_max ?? null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("הבקשה פורסמה");
    setOpen(false);
    setForm({ title: "", description: "", category: "", brand: "", model: "", budget_min: "", budget_max: "" });
    load();
  };

  const filtered = items.filter((w) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      w.title.toLowerCase().includes(s) ||
      w.description.toLowerCase().includes(s) ||
      (w.brand ?? "").toLowerCase().includes(s) ||
      (w.model ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <ModulePlaceholder icon={Search} title="מבוקש לקנייה" subtitle="קונים מהקהילה מחפשים. אם יש לך מתאים — סגרו עסקה.">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="h-4 w-4" />חזרה ללוח
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold">
                <Plus className="h-4 w-4" />פרסם בקשת קנייה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="text-right">בקשת קנייה חדשה</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>מה מחפש? *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="קלידי Yamaha PSR בשימוש קל" maxLength={200} />
                </div>
                <div className="space-y-1">
                  <Label>תיאור מפורט *</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={4000} placeholder="פירוט: שנה, מצב, איזור איסוף, דרישות מיוחדות..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>קטגוריה</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="קלידים / גיטרות..." />
                  </div>
                  <div className="space-y-1">
                    <Label>מותג</Label>
                    <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Yamaha" />
                  </div>
                  <div className="space-y-1">
                    <Label>דגם</Label>
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="PSR-SX900" />
                  </div>
                  <div />
                  <div className="space-y-1">
                    <Label>תקציב מינ' (₪)</Label>
                    <Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>תקציב מקס' (₪)</Label>
                    <Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>ביטול</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}פרסם
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש בקשות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">אין בקשות פעילות. היה הראשון לפרסם!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((w) => (
              <WantedCard key={w.id} w={w} buyer={buyers[w.user_id]} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
    </ModulePlaceholder>
  );
}

function WantedCard({ w, buyer, currentUserId }: { w: Wanted; buyer?: Buyer; currentUserId?: string }) {
  const isOwner = currentUserId === w.user_id;
  const [reaching, setReaching] = useState(false);

  const reachOut = async () => {
    if (!currentUserId) { toast.error("יש להתחבר"); return; }
    if (isOwner) return;
    setReaching(true);
    // WTB threads reuse marketplace_chat_threads with listing_id = NULL is not allowed (NOT NULL).
    // Instead, send a private notification to the buyer.
    const { error } = await supabase.from("notifications").insert({
      user_id: w.user_id,
      type: "wtb_response",
      title: "יש מוכר עם מה שחיפשת!",
      body: `משתמש מציע מענה לבקשה: "${w.title}". צרו קשר דרך הפרופיל.`,
      link: "/profile",
      actor_id: currentUserId,
      metadata: { wanted_id: w.id },
    });
    setReaching(false);
    if (error) { toast.error("שליחה נכשלה"); return; }
    toast.success("הבקשה נשלחה — הקונה יקבל התראה");
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-b from-card to-card/60 p-5 flex flex-col gap-3 hover:border-amber-500/40 transition">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold line-clamp-1">{w.title}</h3>
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0">
          <Wallet className="h-3 w-3" />{formatBudget(w.budget_min, w.budget_max)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{w.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {w.category && <Badge variant="secondary">{w.category}</Badge>}
        {w.brand && <Badge variant="outline">{w.brand}</Badge>}
        {w.model && <Badge variant="outline">{w.model}</Badge>}
      </div>
      <div className="flex items-center justify-between pt-2 border-t mt-auto">
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
          {buyer?.avatar_url ? <img src={buyer.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" /> : <div className="h-6 w-6 rounded-full bg-muted" />}
          <span>{buyer?.display_name ?? "משתמש"} · {new Date(w.created_at).toLocaleDateString("he-IL")}</span>
        </div>
        {!isOwner && (
          <Button size="sm" onClick={reachOut} disabled={reaching} className="bg-emerald-600 hover:bg-emerald-700">
            <MessageCircle className="h-3 w-3" />יש לי כזה למכור!
          </Button>
        )}
        {isOwner && <Badge variant="secondary">הבקשה שלך</Badge>}
      </div>
    </div>
  );
}
