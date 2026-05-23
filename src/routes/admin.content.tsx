import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireAdmin } from "@/lib/routeGuards";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Check, X, Trash2, Plus, ExternalLink, Zap } from "lucide-react";

export const Route = createFileRoute("/admin/content")({
  beforeLoad: requireAdmin,
  component: ContentManagerPage,
  head: () => ({ meta: [{ title: "מנהל תוכן | אדמין" }] }),
});

function ContentManagerPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8" dir="rtl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">מנהל תוכן ותיוג דינמי</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              אישור ערכי ויקי, ניהול תגיות משתמשים, ואוטומציות תוכן.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/content/pages">ניהול דפי אתר →</Link>
          </Button>
        </div>
        <Tabs defaultValue="wiki" className="w-full">
          <TabsList>
            <TabsTrigger value="wiki">אישורי ויקי</TabsTrigger>
            <TabsTrigger value="tags">תגיות משתמשים</TabsTrigger>
            <TabsTrigger value="automations">אוטומציות</TabsTrigger>
          </TabsList>
          <TabsContent value="wiki" className="mt-4">
            <WikiApprovalsPanel />
          </TabsContent>
          <TabsContent value="tags" className="mt-4">
            <UserTagsPanel />
          </TabsContent>
          <TabsContent value="automations" className="mt-4">
            <AutomationsShortcutPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

/* ---------- Wiki Approvals ---------- */
type WikiRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  approval_status: string;
  created_at: string;
  created_by: string | null;
};

function WikiApprovalsPanel() {
  const [rows, setRows] = useState<WikiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("wiki_articles")
      .select("id, title, slug, category, summary, approval_status, created_at, created_by")
      .eq("approval_status", "pending_review")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת ערכי ויקי");
    setRows((data ?? []) as WikiRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const reason = status === "rejected" ? window.prompt("סיבת דחייה (אופציונלי):") ?? null : null;
    const { error } = await (supabase as any).rpc("admin_set_wiki_approval", {
      _article_id: id, _status: status, _reason: reason,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "פורסם" : "נדחה");
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ערכים ממתינים לאישור ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">אין ערכים שממתינים כרגע.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.title}</span>
                    <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                  </div>
                  {r.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    נוצר: {new Date(r.created_at).toLocaleString("he-IL")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/wiki/$slug" params={{ slug: r.slug }} target="_blank">
                      <ExternalLink className="ms-1 h-3 w-3" /> תצוגה
                    </Link>
                  </Button>
                  <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, "approved")}>
                    <Check className="ms-1 h-3 w-3" /> אישור
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r.id, "rejected")}>
                    <X className="ms-1 h-3 w-3" /> דחייה
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- User Tags ---------- */
type TagRow = {
  id: string;
  customer_id: string;
  tag: string;
  category: string | null;
  color: string | null;
  created_at: string;
  profile?: { display_name: string | null; username: string | null } | null;
};

const TAG_CATEGORIES = ["pro_level", "forum_role", "status", "custom"];

function UserTagsPanel() {
  const [rows, setRows] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  // New tag form
  const [userId, setUserId] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState("custom");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("customer_tags")
      .select("id, customer_id, tag, category, color, created_at, profile:profiles!customer_tags_customer_id_fkey(display_name, username)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      // fallback without profile join
      const fb = await (supabase as any).from("customer_tags")
        .select("id, customer_id, tag, category, color, created_at")
        .order("created_at", { ascending: false }).limit(200);
      setRows((fb.data ?? []) as TagRow[]);
    } else {
      setRows((data ?? []) as TagRow[]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const assign = async () => {
    if (!userId || !tag) { toast.error("הזן User ID ושם תגית"); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc("assign_user_tag", {
      _user_id: userId.trim(), _tag: tag.trim(), _category: category, _color: "default",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("תגית נוספה");
    setTag(""); setUserId("");
    load();
  };

  const remove = async (r: TagRow) => {
    if (!confirm(`להסיר את התגית "${r.tag}"?`)) return;
    const { error } = await (supabase as any).rpc("remove_user_tag", {
      _user_id: r.customer_id, _tag: r.tag,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("הוסר");
    load();
  };

  const filtered = rows.filter((r) =>
    !search ||
    r.tag.toLowerCase().includes(search.toLowerCase()) ||
    (r.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.customer_id.includes(search) ||
    (r.profile?.display_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">הוסף תגית חדשה</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Input placeholder="שם תגית (למשל: Expert)" value={tag} onChange={(e) => setTag(e.target.value)} />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={category} onChange={(e) => setCategory(e.target.value)}
          >
            {TAG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button disabled={busy} onClick={assign}>
            <Plus className="ms-1 h-4 w-4" /> שייך
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">תגיות פעילות ({filtered.length})</CardTitle>
          <Input
            className="max-w-xs" placeholder="חיפוש..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">אין תגיות.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.tag}</Badge>
                      {r.category && <span className="text-[10px] text-muted-foreground">{r.category}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {r.profile?.display_name ?? r.customer_id}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-3 w-3 text-rose-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Automations shortcut ---------- */
function AutomationsShortcutPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> אוטומציות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          ניהול חוקי אוטומציה (למשל: "כאשר booking עובר ל-booked, שלח Email Template X")
          מתבצע במסך האוטומציות הקיים.
        </p>
        <Button asChild>
          <Link to="/admin/automations">פתיחת מסך האוטומציות</Link>
        </Button>
        <p className="text-xs">
          טריגרים נתמכים: שינויי סטטוס פנייה (music_pro_inquiry), הרשמות, הזמנות, ועוד.
          סגירת booking מזכה אוטומטית את הלקוח ב-500 נקודות (event_key: <code>booking_closed</code>).
        </p>
      </CardContent>
    </Card>
  );
}
