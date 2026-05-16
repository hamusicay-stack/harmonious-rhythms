import { requireAdmin } from "@/lib/routeGuards";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Crown, TicketPercent, Gamepad2, Handshake, Save, Loader2, Plus, Pencil, Trash2,
  Search, Coins, Users as UsersIcon, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commerce/global-economy")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "מרכז הכלכלה הגלובלית — אדמין" }] }),
  component: GlobalEconomyPage,
});

// ============================================================================
// Page Shell
// ============================================================================

function GlobalEconomyPage() {
  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-5">
        <div>
          <h1 className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-2xl font-bold text-transparent">
            כלכלה גלובלית והרשאות
          </h1>
          <p className="text-sm text-zinc-400">
            מקור האמת היחיד למנויים, קופונים, גיימיפיקציה ושותפים.
          </p>
        </div>
        <Sparkles className="h-6 w-6 text-amber-400" />
      </header>

      <Tabs defaultValue="vip" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="vip" className="gap-1"><Crown className="h-4 w-4" /> מטריצת VIP</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1"><TicketPercent className="h-4 w-4" /> קופונים</TabsTrigger>
          <TabsTrigger value="points" className="gap-1"><Gamepad2 className="h-4 w-4" /> נקודות</TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-1"><Handshake className="h-4 w-4" /> שותפים</TabsTrigger>
        </TabsList>

        <TabsContent value="vip"><VipMatrixTab /></TabsContent>
        <TabsContent value="coupons"><CouponsTab /></TabsContent>
        <TabsContent value="points"><PointsTab /></TabsContent>
        <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab 1: VIP Matrix
// ============================================================================

type Tier = {
  id: string;
  slug: string;
  name: string;
  rank: number;
  is_vip: boolean;
  shop_discount_percent: number;
  academy_discount_percent: number;
  marketplace_free_boosts: number;
};

function VipMatrixTab() {
  const qc = useQueryClient();
  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["ge-tiers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_tiers")
        .select("id, slug, name, rank, is_vip, shop_discount_percent, academy_discount_percent, marketplace_free_boosts")
        .order("rank");
      if (error) throw error;
      return (data ?? []) as Tier[];
    },
  });

  const [draft, setDraft] = useState<Record<string, Partial<Tier>>>({});
  const merged = useMemo(
    () => tiers.map((t) => ({ ...t, ...(draft[t.id] ?? {}) })),
    [tiers, draft],
  );
  const dirty = Object.keys(draft).length > 0;

  const saveMatrix = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(draft).map(([id, patch]) =>
        (supabase as any).from("subscription_tiers").update({
          shop_discount_percent: Number(patch.shop_discount_percent ?? 0),
          academy_discount_percent: Number(patch.academy_discount_percent ?? 0),
          marketplace_free_boosts: Number(patch.marketplace_free_boosts ?? 0),
        }).eq("id", id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      toast.success("המטריצה נשמרה");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["ge-tiers"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  const patch = (id: string, key: keyof Tier, val: number) => {
    setDraft((d) => ({ ...d, [id]: { ...(d[id] ?? {}), [key]: val } }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> מטריצת הטבות לכל דרגה</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">קבע את ההנחות והבונוסים לכל רמת מנוי.</p>
          </div>
          <Button onClick={() => saveMatrix.mutate()} disabled={!dirty || saveMatrix.isPending} className="gap-1">
            {saveMatrix.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            שמור מטריצה
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>דרגה</TableHead>
                    <TableHead className="text-center">הנחת חנות (%)</TableHead>
                    <TableHead className="text-center">הנחת אקדמיה (%)</TableHead>
                    <TableHead className="text-center">קידומים חינם ביד 2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merged.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {t.is_vip && <Crown className="h-4 w-4 text-amber-500" />}
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="outline" className="text-xs">{t.slug}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number" min={0} max={100}
                          className="mx-auto w-24 text-center"
                          value={t.shop_discount_percent ?? 0}
                          onChange={(e) => patch(t.id, "shop_discount_percent", Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number" min={0} max={100}
                          className="mx-auto w-24 text-center"
                          value={t.academy_discount_percent ?? 0}
                          onChange={(e) => patch(t.id, "academy_discount_percent", Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number" min={0}
                          className="mx-auto w-24 text-center"
                          value={t.marketplace_free_boosts ?? 0}
                          onChange={(e) => patch(t.id, "marketplace_free_boosts", Number(e.target.value))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserUpgradesTable tiers={tiers} />
    </div>
  );
}

function UserUpgradesTable({ tiers }: { tiers: Tier[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["ge-users", q],
    queryFn: async () => {
      let query = (supabase as any)
        .from("profiles")
        .select("id, display_name, email, global_subscription_tier_id, subscription_tier")
        .order("created_at", { ascending: false })
        .limit(50);
      if (q.trim()) {
        query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setTier = useMutation({
    mutationFn: async ({ userId, tierId }: { userId: string; tierId: string | null }) => {
      const { error } = await (supabase as any).from("profiles")
        .update({ global_subscription_tier_id: tierId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("דרגת המשתמש עודכנה");
      qc.invalidateQueries({ queryKey: ["ge-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "עדכון נכשל"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" /> שדרוג משתמשים</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או אימייל" className="pr-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">לא נמצאו משתמשים.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>משתמש</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>דרגה נוכחית</TableHead>
                  <TableHead className="text-end">שנה דרגה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => {
                  const currentTier = tiers.find((t) => t.id === u.global_subscription_tier_id);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.display_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={currentTier?.is_vip ? "default" : "secondary"}>
                          {currentTier?.is_vip && <Crown className="ml-1 h-3 w-3" />}
                          {currentTier?.name ?? u.subscription_tier ?? "חינם"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Select
                          value={u.global_subscription_tier_id ?? "__none__"}
                          onValueChange={(v) => setTier.mutate({ userId: u.id, tierId: v === "__none__" ? null : v })}
                        >
                          <SelectTrigger className="w-40 ms-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">ללא</SelectItem>
                            {tiers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab 2: Coupons CRUD
// ============================================================================

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
};

const emptyCoupon: Partial<Coupon> = {
  code: "", description: "", discount_type: "percent", discount_value: 10,
  min_order_amount: 0, max_uses: null, expires_at: null, is_active: true,
};

function CouponsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["ge-coupons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shop_coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<Coupon>) => {
      const payload: any = {
        code: (row.code ?? "").trim().toUpperCase(),
        description: row.description || null,
        discount_type: row.discount_type ?? "percent",
        discount_value: Number(row.discount_value ?? 0),
        min_order_amount: Number(row.min_order_amount ?? 0),
        max_uses: row.max_uses == null || (row.max_uses as any) === "" ? null : Number(row.max_uses),
        expires_at: row.expires_at || null,
        is_active: !!row.is_active,
      };
      if (!payload.code) throw new Error("חסר קוד");
      if (row.id) {
        const { error } = await (supabase as any).from("shop_coupons").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("shop_coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("נשמר בהצלחה"); setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["ge-coupons"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("shop_coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ge-coupons"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shop_coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הקופון נמחק"); qc.invalidateQueries({ queryKey: ["ge-coupons"] }); },
    onError: (e: any) => toast.error(e.message ?? "מחיקה נכשלה"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><TicketPercent className="h-5 w-5 text-amber-500" /> ניהול קופונים</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">קודי הנחה, סוג, ערך, תוקף ושימושים.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing({ ...emptyCoupon }); setOpen(true); }} className="gap-1">
              <Plus className="h-4 w-4" /> קופון חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>{editing?.id ? "עריכת קופון" : "קופון חדש"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>קוד</Label>
                  <Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="WELCOME10" />
                </div>
                <div>
                  <Label>תיאור</Label>
                  <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>סוג הנחה</Label>
                    <Select value={editing.discount_type ?? "percent"} onValueChange={(v: any) => setEditing({ ...editing, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">אחוז (%)</SelectItem>
                        <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ערך</Label>
                    <Input type="number" min={0} value={editing.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>הזמנה מינימלית (₪)</Label>
                    <Input type="number" min={0} value={editing.min_order_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>מקסימום שימושים</Label>
                    <Input type="number" min={0} value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value === "" ? null : Number(e.target.value) })} placeholder="ללא הגבלה" />
                  </div>
                </div>
                <div>
                  <Label>תוקף עד</Label>
                  <Input type="datetime-local" value={editing.expires_at ? editing.expires_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <Label>פעיל</Label>
                  <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
              <Button onClick={() => editing && upsert.mutate(editing)} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : coupons.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">עדיין אין קופונים.</div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <code className="rounded bg-muted px-2 py-1 text-sm font-bold tracking-wider">{c.code}</code>
                  <span className="text-sm font-medium">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `₪${c.discount_value}`}
                  </span>
                  {c.min_order_amount > 0 && <span className="text-xs text-muted-foreground">מינ' ₪{c.min_order_amount}</span>}
                  {c.max_uses != null && <span className="text-xs text-muted-foreground">{c.current_uses}/{c.max_uses}</span>}
                  {c.expires_at && <span className="text-xs text-muted-foreground">עד {new Date(c.expires_at).toLocaleDateString("he-IL")}</span>}
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "פעיל" : "כבוי"}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: c.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...c }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`למחוק את ${c.code}?`)) del.mutate(c.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab 3: Points Engine
// ============================================================================

type PointsRule = {
  id: string;
  event_key: string;
  label: string;
  points: number;
  enabled: boolean;
};

function PointsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PointsRule> | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["ge-points-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("points_rules").select("*").order("event_key");
      if (error) throw error;
      return (data ?? []) as PointsRule[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["ge-points-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("points_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as { id: number; points_per_nis: number } | null;
    },
  });

  const [perNis, setPerNis] = useState<number | null>(null);
  const currentPerNis = perNis ?? settings?.points_per_nis ?? 100;

  const saveSettings = useMutation({
    mutationFn: async (val: number) => {
      const { error } = await (supabase as any)
        .from("points_settings").upsert({ id: 1, points_per_nis: val });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ערך הנקודות נשמר");
      qc.invalidateQueries({ queryKey: ["ge-points-settings"] });
      setPerNis(null);
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<PointsRule>) => {
      const payload: any = {
        event_key: (row.event_key ?? "").trim(),
        label: (row.label ?? "").trim(),
        points: Number(row.points ?? 0),
        enabled: row.enabled ?? true,
      };
      if (!payload.event_key || !payload.label) throw new Error("חסרים שדות חובה");
      if (row.id) {
        const { error } = await (supabase as any).from("points_rules").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("points_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("נשמר"); setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["ge-points-rules"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase as any).from("points_rules").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ge-points-rules"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("points_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["ge-points-rules"] }); },
    onError: (e: any) => toast.error(e.message ?? "מחיקה נכשלה"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-amber-500" /> ערך הנקודות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>נקודות לכל ₪1 הנחה</Label>
              <Input
                type="number" min={1} className="w-40"
                value={currentPerNis}
                onChange={(e) => setPerNis(Number(e.target.value))}
              />
            </div>
            <p className="text-sm text-muted-foreground pb-2">
              דוגמה: {currentPerNis} נקודות = הנחה של ₪1
            </p>
            <Button
              onClick={() => saveSettings.mutate(currentPerNis)}
              disabled={perNis == null || saveSettings.isPending}
              className="gap-1"
            >
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-amber-500" /> חוקי הענקת נקודות</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">כמה נקודות מוענקות על כל פעולה.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing({ event_key: "", label: "", points: 5, enabled: true }); setOpen(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> חוק חדש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>{editing?.id ? "עריכת חוק" : "חוק חדש"}</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div>
                    <Label>מפתח פעולה (event_key)</Label>
                    <Input
                      value={editing.event_key ?? ""}
                      onChange={(e) => setEditing({ ...editing, event_key: e.target.value })}
                      placeholder="forum_post_create"
                      disabled={!!editing.id}
                    />
                  </div>
                  <div>
                    <Label>שם תצוגה</Label>
                    <Input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="תגובה בפורום" />
                  </div>
                  <div>
                    <Label>נקודות</Label>
                    <Input type="number" value={editing.points ?? 0} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center justify-between rounded border p-3">
                    <Label>פעיל</Label>
                    <Switch checked={!!editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                <Button onClick={() => editing && upsert.mutate(editing)} disabled={upsert.isPending}>
                  {upsert.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} שמור
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>פעולה</TableHead>
                  <TableHead>מפתח</TableHead>
                  <TableHead className="text-center">נקודות</TableHead>
                  <TableHead className="text-center">פעיל</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell><code className="text-xs">{r.event_key}</code></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">+{r.points}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={r.enabled} onCheckedChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...r }); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`למחוק את ${r.label}?`)) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab 4: Affiliates & KPIs
// ============================================================================

function AffiliatesTab() {
  const qc = useQueryClient();

  const { data: kpis } = useQuery({
    queryKey: ["ge-kpis"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [vipCount, couponUses, activeAff, totalEarn] = await Promise.all([
        (supabase as any).from("profiles").select("id", { count: "exact", head: true })
          .not("global_subscription_tier_id", "is", null),
        (supabase as any).from("shop_orders").select("id", { count: "exact", head: true })
          .not("coupon_code", "is", null).gte("created_at", monthStart.toISOString()),
        (supabase as any).from("affiliates").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("affiliate_conversions").select("commission_amount")
          .in("status", ["approved", "paid"]),
      ]);

      const totalCommission = (totalEarn.data ?? []).reduce(
        (s: number, r: any) => s + Number(r.commission_amount ?? 0), 0,
      );

      return {
        vips: vipCount.count ?? 0,
        couponUses: couponUses.count ?? 0,
        activeAffiliates: activeAff.count ?? 0,
        totalCommission,
      };
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["ge-affiliate-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [draft, setDraft] = useState<{ pct?: number; cookie?: number; payout?: number }>({});

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("affiliate_settings").update({
        default_commission_percent: draft.pct ?? settings?.default_commission_percent,
        cookie_days: draft.cookie ?? settings?.cookie_days,
        min_payout: draft.payout ?? settings?.min_payout,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הגדרות השותפים נשמרו");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["ge-affiliate-settings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שמירה נכשלה"),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="חברי VIP פעילים" value={kpis?.vips ?? 0} icon={Crown} />
        <KpiCard label="קופונים מומשו החודש" value={kpis?.couponUses ?? 0} icon={TicketPercent} />
        <KpiCard label="שותפים פעילים" value={kpis?.activeAffiliates ?? 0} icon={Handshake} />
        <KpiCard label="עמלות (₪)" value={`₪${Math.round(kpis?.totalCommission ?? 0).toLocaleString("he-IL")}`} icon={Coins} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5 text-amber-500" /> הגדרות תוכנית השותפים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>עמלת ברירת מחדל (%)</Label>
              <Input
                type="number" min={0} max={100} step="0.01"
                value={draft.pct ?? settings?.default_commission_percent ?? 10}
                onChange={(e) => setDraft({ ...draft, pct: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>תוקף עוגייה (ימים)</Label>
              <Input
                type="number" min={1}
                value={draft.cookie ?? settings?.cookie_days ?? 30}
                onChange={(e) => setDraft({ ...draft, cookie: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>סף משיכה מינימלי (₪)</Label>
              <Input
                type="number" min={0}
                value={draft.payout ?? settings?.min_payout ?? 100}
                onChange={(e) => setDraft({ ...draft, payout: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={Object.keys(draft).length === 0 || save.isPending} className="gap-1">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור הגדרות
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-900/60 to-zinc-950/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold text-amber-300">{value}</div>
          </div>
          <Icon className="h-8 w-8 text-amber-500/60" />
        </div>
      </CardContent>
    </Card>
  );
}
