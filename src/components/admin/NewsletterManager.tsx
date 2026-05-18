import { friendlyError } from "@/lib/errors";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Send, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type Filters = {
  organ_model?: string;
  user_type?: string;
  subscription_tier?: string;
  inactive_days?: number; // last login older than N days (or never)
  bought_product_name?: string;
  enrolled_course_id?: string;
  has_abandoned_cart?: boolean;
  email_opt_in_only?: boolean;
};

type Segment = { id: string; name: string; description: string | null; filters: Filters; created_at: string };
type Campaign = { id: string; subject: string; segment_id: string | null; recipients_count: number; sent_count: number; status: string; created_at: string; sent_at: string | null };

async function computeAudience(filters: Filters): Promise<{ ids: string[]; emails: string[] }> {
  let q = supabase.from("profiles").select("id, email, organ_model, user_type, subscription_tier, last_login_at, email_opt_in");
  if (filters.organ_model) q = q.eq("organ_model", filters.organ_model);
  if (filters.user_type) q = q.eq("user_type", filters.user_type);
  if (filters.subscription_tier) q = q.eq("subscription_tier", filters.subscription_tier);
  if (filters.email_opt_in_only) q = q.eq("email_opt_in", true);
  const { data: profiles } = await q.limit(5000);
  let users = (profiles ?? []) as any[];

  if (filters.inactive_days && filters.inactive_days > 0) {
    const cutoff = new Date(Date.now() - filters.inactive_days * 86400000).toISOString();
    users = users.filter((u) => !u.last_login_at || u.last_login_at < cutoff);
  }

  if (filters.bought_product_name) {
    const { data } = await supabase.from("orders").select("customer_id").ilike("product_name", `%${filters.bought_product_name}%`);
    const set = new Set((data ?? []).map((r: any) => r.customer_id));
    users = users.filter((u) => set.has(u.id));
  }

  if (filters.enrolled_course_id) {
    const { data } = await supabase.from("academy_enrollments").select("user_id").eq("course_id", filters.enrolled_course_id);
    const set = new Set((data ?? []).map((r: any) => r.user_id));
    users = users.filter((u) => set.has(u.id));
  }

  if (filters.has_abandoned_cart) {
    const cutoff = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data } = await supabase.from("cart_items").select("user_id").lt("added_at", cutoff);
    const set = new Set((data ?? []).map((r: any) => r.user_id));
    users = users.filter((u) => set.has(u.id));
  }

  return {
    ids: users.map((u) => u.id),
    emails: users.map((u) => u.email).filter(Boolean),
  };
}

export function NewsletterManager() {
  return (
    <Tabs defaultValue="composer" dir="rtl" className="space-y-4">
      <TabsList>
        <TabsTrigger value="composer"><Send className="ml-1 h-4 w-4" />קמפיין חדש</TabsTrigger>
        <TabsTrigger value="segments"><Users className="ml-1 h-4 w-4" />סגמנטים</TabsTrigger>
        <TabsTrigger value="history">היסטוריה</TabsTrigger>
      </TabsList>
      <TabsContent value="composer"><CampaignComposer /></TabsContent>
      <TabsContent value="segments"><SegmentsManager /></TabsContent>
      <TabsContent value="history"><CampaignHistory /></TabsContent>
    </Tabs>
  );
}

function FiltersForm({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const [models, setModels] = useState<string[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    supabase.from("keyboard_models").select("name").then(({ data }) => setModels((data ?? []).map((r: any) => r.name)));
    supabase.from("academy_courses").select("id, title").then(({ data }) => setCourses((data ?? []) as any));
  }, []);

  const upd = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label>דגם אורגן</Label>
        <Select value={filters.organ_model ?? "all"} onValueChange={(v) => upd({ organ_model: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue placeholder="כולם" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כולם</SelectItem>
            {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>סוג משתמש</Label>
        <Select value={filters.user_type ?? "all"} onValueChange={(v) => upd({ user_type: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כולם</SelectItem>
            <SelectItem value="customer">לקוח</SelectItem>
            <SelectItem value="supplier">ספק</SelectItem>
            <SelectItem value="admin">מנהל</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>סטטוס מנוי</Label>
        <Select value={filters.subscription_tier ?? "all"} onValueChange={(v) => upd({ subscription_tier: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="free">חינם</SelectItem>
            <SelectItem value="premium">פרימיום</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>לא התחבר X ימים (ריק = ללא סינון)</Label>
        <Input type="number" min={0} value={filters.inactive_days ?? ""} onChange={(e) => upd({ inactive_days: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div className="space-y-2">
        <Label>קנה מוצר שמכיל (חיפוש בשם)</Label>
        <Input value={filters.bought_product_name ?? ""} onChange={(e) => upd({ bought_product_name: e.target.value || undefined })} placeholder="למשל: Genos" />
      </div>
      <div className="space-y-2">
        <Label>רשום לקורס</Label>
        <Select value={filters.enrolled_course_id ?? "all"} onValueChange={(v) => upd({ enrolled_course_id: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ללא</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={!!filters.has_abandoned_cart} onCheckedChange={(v) => upd({ has_abandoned_cart: v === true })} />
        נטשו עגלה (2+ שעות)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={filters.email_opt_in_only !== false} onCheckedChange={(v) => upd({ email_opt_in_only: v === true })} />
        רק מי שאישר דיוור
      </label>
    </div>
  );
}

function CampaignComposer() {
  const [filters, setFilters] = useState<Filters>({ email_opt_in_only: true });
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentId, setSegmentId] = useState<string>("custom");

  useEffect(() => {
    supabase.from("newsletter_segments").select("*").order("created_at", { ascending: false }).then(({ data }) => setSegments((data ?? []) as any));
  }, []);

  const refreshCount = async () => {
    setCounting(true);
    const aud = await computeAudience(filters);
    setCount(aud.emails.length);
    setCounting(false);
  };

  useEffect(() => { refreshCount(); }, [JSON.stringify(filters)]);

  const onSegmentChange = (id: string) => {
    setSegmentId(id);
    if (id !== "custom") {
      const s = segments.find((x) => x.id === id);
      if (s) setFilters(s.filters || {});
    }
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) { toast.error("נא למלא נושא וגוף המייל"); return; }
    setSending(true);
    try {
      const aud = await computeAudience(filters);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: campaign, error } = await supabase.from("newsletter_campaigns").insert({
        subject,
        body_html: body,
        segment_id: segmentId === "custom" ? null : segmentId,
        segment_filters: filters,
        recipients_count: aud.emails.length,
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: aud.emails.length,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      toast.success(`קמפיין נשמר. ${aud.emails.length} נמענים. (חיבור שליחה בפועל יגיע בלוף הבא)`);
      setSubject(""); setBody("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>קמפיין חדש</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>טען סגמנט שמור</Label>
          <Select value={segmentId} onValueChange={onSegmentChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">סינון מותאם</SelectItem>
              {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <FiltersForm filters={filters} setFilters={setFilters} />

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <Users className="ml-1 inline h-4 w-4" />
          {counting ? <Loader2 className="inline h-4 w-4 animate-spin" /> : <Badge variant="secondary">{count ?? 0} נמענים תואמים</Badge>}
        </div>

        <div className="space-y-2">
          <Label>נושא המייל</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="חדש! סט מקצבים ל-Genos" />
        </div>
        <div className="space-y-2">
          <Label>תוכן המייל (HTML)</Label>
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="<h1>היי!</h1><p>תוכן...</p>" />
        </div>

        <Button onClick={send} disabled={sending || (count ?? 0) === 0}>
          {sending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
          שלח לקמפיין ({count ?? 0})
        </Button>
      </CardContent>
    </Card>
  );
}

function SegmentsManager() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<Filters>({ email_opt_in_only: true });

  const load = async () => {
    const { data } = await supabase.from("newsletter_segments").select("*").order("created_at", { ascending: false });
    setSegments((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!name.trim()) { toast.error("שם הסגמנט חובה"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("newsletter_segments").insert({ name, description, filters, created_by: user?.id });
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("סגמנט נשמר");
    setName(""); setDescription(""); setFilters({ email_opt_in_only: true });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק סגמנט?")) return;
    await supabase.from("newsletter_segments").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>סגמנט חדש</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="שם" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="תיאור (לא חובה)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <FiltersForm filters={filters} setFilters={setFilters} />
          <Button onClick={save}><Save className="ml-2 h-4 w-4" />שמור</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>סגמנטים שמורים</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {segments.length === 0 && <p className="text-sm text-muted-foreground">אין סגמנטים עדיין.</p>}
          {segments.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-semibold">{s.name}</div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignHistory() {
  const [items, setItems] = useState<Campaign[]>([]);
  useEffect(() => {
    supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems((data ?? []) as any));
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle>היסטוריית קמפיינים</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">עדיין אין קמפיינים.</p>}
        {items.map((c) => (
          <div key={c.id} className="rounded border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.subject}</span>
              <Badge variant="secondary">{c.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleString("he-IL")} · {c.recipients_count} נמענים
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
