import { friendlyError } from "@/lib/errors";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Sparkles, Plus, Trash2, Save, Trophy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type App = { id: string; user_id: string; reason: string | null; audience: string | null; status: string; created_at: string; display_name?: string | null; email?: string | null };
type Aff = { id: string; user_id: string; ref_code: string; commission_percent: number | null; total_earned: number; total_paid: number; total_clicks: number; total_conversions: number; is_active: boolean; display_name?: string | null; email?: string | null };
type Override = { id: string; scope_type: string; scope_id: string; commission_percent: number };
type Conversion = { id: string; affiliate_id: string; scope_type: string; scope_id: string; order_amount: number; commission_amount: number; status: string; created_at: string };

export function AffiliatesManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />ניהול שותפים (Affiliates)</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Tabs defaultValue="apps" dir="rtl">
          <TabsList className="flex w-full h-auto gap-1 overflow-x-auto md:grid md:grid-cols-6">
            <TabsTrigger value="apps" className="shrink-0 text-xs sm:text-sm">בקשות</TabsTrigger>
            <TabsTrigger value="affs" className="shrink-0 text-xs sm:text-sm">שותפים</TabsTrigger>
            <TabsTrigger value="convs" className="shrink-0 text-xs sm:text-sm">המרות</TabsTrigger>
            <TabsTrigger value="overrides" className="shrink-0 text-xs sm:text-sm">עמלות מוצר</TabsTrigger>
            <TabsTrigger value="lottery" className="shrink-0 text-xs sm:text-sm gap-1"><Trophy className="h-3 w-3" />הגרלה</TabsTrigger>
            <TabsTrigger value="settings" className="shrink-0 text-xs sm:text-sm">הגדרות</TabsTrigger>
          </TabsList>
          <TabsContent value="apps" className="mt-4"><Applications /></TabsContent>
          <TabsContent value="affs" className="mt-4"><Affiliates /></TabsContent>
          <TabsContent value="convs" className="mt-4"><Conversions /></TabsContent>
          <TabsContent value="overrides" className="mt-4"><Overrides /></TabsContent>
          <TabsContent value="lottery" className="mt-4"><LotteryReport /></TabsContent>
          <TabsContent value="settings" className="mt-4"><Settings /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

async function joinProfiles<T extends { user_id: string }>(rows: T[]): Promise<(T & { display_name: string | null; email: string | null })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, display_name: null, email: null }));
  const { data: profs } = await supabase.from("profiles").select("id,display_name,email").in("id", ids);
  const m = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, display_name: m.get(r.user_id)?.display_name ?? null, email: m.get(r.user_id)?.email ?? null }));
}

function Applications() {
  const [items, setItems] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("affiliate_applications").select("*").eq("status", filter).order("created_at", { ascending: false });
    setItems(await joinProfiles((data ?? []) as App[]));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("affiliate_approve_application", { _app_id: id });
    if (error) return toast.error(friendlyError(error));
    toast.success("השותף אושר!"); load();
  };
  const reject = async (id: string) => {
    const reason = prompt("סיבת דחייה (אופציונלי):") ?? "";
    const { error } = await supabase.from("affiliate_applications")
      .update({ status: "rejected", admin_notes: reason || null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("נדחה"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "ממתינות" : s === "approved" ? "אושרו" : "נדחו"}
          </Button>
        ))}
      </div>
      {loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" /> : items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">אין בקשות</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-semibold text-sm">{a.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              {a.reason && <p className="text-sm">{a.reason}</p>}
              {a.audience && <p className="text-xs text-muted-foreground">קהל: {a.audience}</p>}
              {filter === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(a.id)}><CheckCircle2 className="ml-1 h-3 w-3" />אשר</Button>
                  <Button size="sm" variant="outline" onClick={() => reject(a.id)}><XCircle className="ml-1 h-3 w-3" />דחה</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Affiliates() {
  const [items, setItems] = useState<Aff[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
    setItems(await joinProfiles((data ?? []) as Aff[]));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const updatePct = async (id: string, pct: string) => {
    const v = pct === "" ? null : Number(pct);
    if (v !== null && (isNaN(v) || v < 0 || v > 100)) return toast.error("0-100 בלבד");
    const { error } = await supabase.from("affiliates").update({ commission_percent: v }).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("נשמר"); load();
  };
  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("affiliates").update({ is_active: active }).eq("id", id);
    if (error) return toast.error(friendlyError(error)); load();
  };

  if (loading) return <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" />;
  if (items.length === 0) return <p className="py-8 text-center text-muted-foreground text-sm">אין עדיין שותפים</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>שותף</TableHead>
            <TableHead>קוד</TableHead>
            <TableHead>% עמלה</TableHead>
            <TableHead>לחיצות</TableHead>
            <TableHead>המרות</TableHead>
            <TableHead>הרווח</TableHead>
            <TableHead>סטטוס</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-semibold text-xs">{a.display_name ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground">{a.email}</div>
              </TableCell>
              <TableCell className="font-mono text-xs">{a.ref_code}</TableCell>
              <TableCell>
                <Input type="number" min={0} max={100} step="0.5" defaultValue={a.commission_percent ?? ""}
                  className="h-8 w-20 text-xs" placeholder="ברירת מחדל"
                  onBlur={(e) => updatePct(a.id, e.target.value)} />
              </TableCell>
              <TableCell className="text-xs">{a.total_clicks}</TableCell>
              <TableCell className="text-xs">{a.total_conversions}</TableCell>
              <TableCell className="text-xs font-bold">₪{Number(a.total_earned).toFixed(0)}</TableCell>
              <TableCell>
                <Button size="sm" variant={a.is_active ? "outline" : "default"} onClick={() => toggle(a.id, !a.is_active)}>
                  {a.is_active ? "השבת" : "הפעל"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Conversions() {
  const [items, setItems] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("affiliate_conversions").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as Conversion[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, newStatus: string) => {
    const patch: { status: string; approved_at?: string; paid_at?: string } = { status: newStatus };
    if (newStatus === "approved") patch.approved_at = new Date().toISOString();
    if (newStatus === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("affiliate_conversions").update(patch).eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("עודכן"); load();
  };

  if (loading) return <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" />;
  if (items.length === 0) return <p className="py-8 text-center text-muted-foreground text-sm">אין המרות</p>;

  return (
    <div className="space-y-2">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm flex-wrap">
          <div>
            <div className="font-semibold">{c.scope_type} · ₪{Number(c.order_amount).toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("he-IL")}</div>
          </div>
          <div className="text-primary font-bold">+₪{Number(c.commission_amount).toFixed(0)}</div>
          <select className="border rounded h-8 text-xs px-2 bg-background"
            value={c.status} onChange={(e) => setStatus(c.id, e.target.value)}>
            <option value="pending">ממתין</option>
            <option value="approved">אושר</option>
            <option value="paid">שולם</option>
            <option value="rejected">נדחה</option>
          </select>
        </div>
      ))}
    </div>
  );
}

function Overrides() {
  const [items, setItems] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeType, setScopeType] = useState("shop_product");
  const [scopeId, setScopeId] = useState("");
  const [pct, setPct] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("affiliate_commission_overrides").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Override[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!scopeId.trim() || !pct) return toast.error("מלא הכל");
    const { error } = await supabase.from("affiliate_commission_overrides")
      .upsert({ scope_type: scopeType, scope_id: scopeId.trim(), commission_percent: Number(pct) },
        { onConflict: "scope_type,scope_id" });
    if (error) return toast.error(friendlyError(error));
    toast.success("נוסף"); setScopeId(""); setPct(""); load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("affiliate_commission_overrides").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error)); load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 space-y-2 bg-card-elevated">
        <div className="grid gap-2 md:grid-cols-[1fr_2fr_100px_auto]">
          <select className="h-9 border rounded px-2 text-sm bg-background" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
            <option value="shop_product">מוצר חנות</option>
            <option value="academy_course">קורס אקדמיה</option>
            <option value="shop_category">קטגוריית חנות</option>
          </select>
          <Input placeholder="מזהה (UUID או slug)" value={scopeId} onChange={(e) => setScopeId(e.target.value)} />
          <Input type="number" placeholder="%" min={0} max={100} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} />
          <Button onClick={add}><Plus className="h-4 w-4" />הוסף</Button>
        </div>
      </div>
      {loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" /> : items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">אין override</p>
      ) : (
        <div className="space-y-1">
          {items.map((o) => (
            <div key={o.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <Badge variant="outline" className="text-[10px]">{o.scope_type}</Badge>
              <span className="font-mono text-xs flex-1 truncate" dir="ltr">{o.scope_id}</span>
              <span className="font-bold text-primary">{o.commission_percent}%</span>
              <Button size="sm" variant="ghost" onClick={() => remove(o.id)} className="text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [pct, setPct] = useState<number>(10);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("affiliate_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPct(Number(data.default_commission_percent));
          setDays(Number(data.cookie_days));
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const { error } = await supabase.from("affiliate_settings").update({
      default_commission_percent: pct, cookie_days: days, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(friendlyError(error));
    toast.success("נשמר");
  };

  if (loading) return <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" />;
  return (
    <div className="space-y-4 rounded-xl border p-5 bg-card-elevated">
      <div>
        <Label>אחוז עמלה ברירת מחדל גלובלי</Label>
        <Input type="number" min={0} max={100} step="0.5" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
      </div>
      <div>
        <Label>חלון cookie (ימים)</Label>
        <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <Button onClick={save} className="w-full"><Save className="ml-1 h-4 w-4" />שמור</Button>
    </div>
  );
}

type LotteryRow = { affiliate_id: string; ref_code: string; display_name: string | null; email: string | null; unique_visitors: number; total_clicks: number };

function LotteryReport() {
  const [rows, setRows] = useState<LotteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [minThreshold, setMinThreshold] = useState<number>(1);
  const [days, setDays] = useState<number>(30);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: clicks } = await supabase
      .from("affiliate_clicks")
      .select("affiliate_id, ref_code, visitor_id")
      .gte("created_at", since);

    const map = new Map<string, { ref_code: string; visitors: Set<string>; total: number }>();
    for (const c of clicks ?? []) {
      let agg = map.get(c.affiliate_id);
      if (!agg) { agg = { ref_code: c.ref_code, visitors: new Set(), total: 0 }; map.set(c.affiliate_id, agg); }
      if (c.visitor_id) agg.visitors.add(c.visitor_id);
      agg.total += 1;
    }

    const affIds = Array.from(map.keys());
    let profilesMap = new Map<string, { display_name: string | null; email: string | null }>();
    if (affIds.length > 0) {
      const { data: affs } = await supabase.from("affiliates").select("id, user_id").in("id", affIds);
      const userIds = (affs ?? []).map((a) => a.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", userIds);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      profilesMap = new Map((affs ?? []).map((a) => [a.id, {
        display_name: profMap.get(a.user_id)?.display_name ?? null,
        email: profMap.get(a.user_id)?.email ?? null,
      }]));
    }

    const list: LotteryRow[] = affIds.map((id) => {
      const agg = map.get(id)!;
      const prof = profilesMap.get(id);
      return {
        affiliate_id: id,
        ref_code: agg.ref_code,
        display_name: prof?.display_name ?? null,
        email: prof?.email ?? null,
        unique_visitors: agg.visitors.size,
        total_clicks: agg.total,
      };
    }).sort((a, b) => b.unique_visitors - a.unique_visitors);

    setRows(list);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => r.unique_visitors >= minThreshold);

  const exportCsv = () => {
    const header = ["שם", "אימייל", "קוד שותף", "כניסות ייחודיות", "סך לחיצות"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const row = [r.display_name ?? "", r.email ?? "", r.ref_code, r.unique_visitors, r.total_clicks]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      lines.push(row);
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lottery-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`יוצא ${filtered.length} שותפים`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card-elevated p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">תקופה (ימים אחרונים)</Label>
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} />
          </div>
          <div>
            <Label className="text-xs">סף מינימלי לכניסות ייחודיות</Label>
            <Input type="number" min={1} value={minThreshold} onChange={(e) => setMinThreshold(Number(e.target.value) || 1)} />
          </div>
          <div className="flex items-end">
            <Button onClick={exportCsv} disabled={filtered.length === 0} className="w-full">
              <Download className="ml-1 h-4 w-4" />ייצא לאקסל ({filtered.length})
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          רק שותפים עם <strong>{minThreshold}+</strong> כניסות ייחודיות מ-{days} הימים האחרונים יכללו בייצוא.
        </p>
      </div>

      {loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" /> : filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">אין שותפים שעמדו בסף</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>שותף</TableHead>
                <TableHead>קוד</TableHead>
                <TableHead>כניסות ייחודיות</TableHead>
                <TableHead>סך לחיצות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.affiliate_id}>
                  <TableCell className="text-xs font-bold">{i + 1}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-xs">{r.display_name ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.ref_code}</TableCell>
                  <TableCell className="text-xs font-bold text-primary">{r.unique_visitors}</TableCell>
                  <TableCell className="text-xs">{r.total_clicks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
