import { friendlyError } from "@/lib/errors";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, Trash2, ShieldCheck, Crown, Star, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

type AppRole = "user" | "member" | "premium" | "vip" | "admin" | "chat_oversight";
const ROLES: AppRole[] = ["user", "member", "premium", "vip", "admin", "chat_oversight"];

const ROLE_LABELS: Record<AppRole, string> = {
  user: "חינמי (Explorer)",
  member: "רשום (Member)",
  premium: "פרימיום",
  vip: "VIP",
  admin: "אדמין",
  chat_oversight: "פיקוח שיחות",
};

const ROLE_ICONS: Record<AppRole, ReactNode> = {
  user: <UserIcon className="h-3.5 w-3.5" />,
  member: <UserIcon className="h-3.5 w-3.5" />,
  premium: <Star className="h-3.5 w-3.5 text-amber-400" />,
  vip: <Crown className="h-3.5 w-3.5 text-purple-400" />,
  admin: <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />,
  chat_oversight: <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />,
};

const DEFAULT_PERMISSIONS = [
  "forum.read", "forum.post", "shorts.view", "shorts.upload",
  "academy.preview", "academy.full", "shop.discount",
  "marketplace.post", "badge.verified", "badge.vip",
];

// Hebrew labels for known permission keys (custom keys still show the raw key)
const PERMISSION_LABELS: Record<string, { title: string; desc: string }> = {
  "forum.read":         { title: "קריאה בפורום",            desc: "צפייה בדיונים ובתגובות" },
  "forum.post":         { title: "כתיבה בפורום",            desc: "פתיחת פוסטים ותגובות חדשות" },
  "shorts.view":        { title: "צפייה בשורטס",            desc: "גישה לפיד הסרטונים האנכיים" },
  "shorts.upload":      { title: "העלאת שורטס",             desc: "פרסום סרטונים אנכיים חדשים" },
  "academy.preview":    { title: "תצוגה מקדימה לאקדמיה",    desc: "צפייה בשיעורי הדגמה חינמיים" },
  "academy.full":       { title: "גישה מלאה לאקדמיה",       desc: "צפייה בכל הקורסים והשיעורים" },
  "shop.discount":      { title: "הנחה בחנות",              desc: "מחירים מוזלים למוצרים נבחרים" },
  "marketplace.post":   { title: "פרסום ביד שניה",          desc: "פתיחת מודעות מכירה חדשות" },
  "badge.verified":     { title: "תג מאומת",                desc: "מציג תג ✓ ליד שם המשתמש" },
  "badge.vip":          { title: "תג VIP",                  desc: "מציג תג כתר ליד שם המשתמש" },
};

type PermRow = { id?: string; role: AppRole; permission_key: string; enabled: boolean };
type Rule = { id: string; event_key: string; label: string; points: number; enabled: boolean };

export function RolesPermissionsManager() {
  return (
    <Tabs defaultValue="matrix">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="matrix">מטריצת הרשאות</TabsTrigger>
        <TabsTrigger value="users">דרגות משתמשים</TabsTrigger>
        <TabsTrigger value="points">נקודות</TabsTrigger>
      </TabsList>
      <TabsContent value="matrix" className="mt-6"><MatrixEditor /></TabsContent>
      <TabsContent value="users" className="mt-6"><UserRoleManager /></TabsContent>
      <TabsContent value="points" className="mt-6"><PointsRulesEditor /></TabsContent>
    </Tabs>
  );
}

/* ---------- Matrix ---------- */
function MatrixEditor() {
  const [rows, setRows] = useState<PermRow[]>([]);
  const [keys, setKeys] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("role_permissions").select("*");
    if (error) { toast.error(friendlyError(error)); setLoading(false); return; }
    const r = (data ?? []) as PermRow[];
    setRows(r);
    const allKeys = Array.from(new Set([...DEFAULT_PERMISSIONS, ...r.map(x => x.permission_key)])).sort();
    setKeys(allKeys);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const get = (role: AppRole, key: string) =>
    rows.find(r => r.role === role && r.permission_key === key)?.enabled ?? false;

  const toggle = (role: AppRole, key: string, val: boolean) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.role === role && r.permission_key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], enabled: val };
        return next;
      }
      return [...prev, { role, permission_key: key, enabled: val }];
    });
  };

  const save = async () => {
    setSaving(true);
    const payload = ROLES.flatMap(role => keys.map(key => ({
      role, permission_key: key, enabled: get(role, key),
    })));
    const { error } = await supabase.from("role_permissions").upsert(payload, {
      onConflict: "role,permission_key",
    });
    setSaving(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("נשמר"); void load(); }
  };

  const addKey = () => {
    const k = newKey.trim().toLowerCase();
    if (!k) return;
    if (keys.includes(k)) { toast.info("ההרשאה כבר קיימת"); return; }
    setKeys(prev => [...prev, k].sort());
    setNewKey("");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>מטריצת הרשאות</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">הפעל/כבה הרשאות לכל דרגה. שינויים נשמרים יחד.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="permission.key חדש" className="w-48" />
          <Button variant="outline" size="sm" onClick={addKey}><Plus className="ml-1 h-4 w-4" />הוסף</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
            שמור
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>הרשאה</TableHead>
              {ROLES.map(r => (
                <TableHead key={r} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {ROLE_ICONS[r]}
                    <span className="text-xs">{ROLE_LABELS[r]}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map(key => {
              const meta = PERMISSION_LABELS[key];
              return (
                <TableRow key={key}>
                  <TableCell className="min-w-[220px]">
                    {meta ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{meta.title}</span>
                        <span className="text-[11px] text-muted-foreground">{meta.desc}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{key}</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs">{key}</span>
                    )}
                  </TableCell>
                  {ROLES.map(role => (
                    <TableCell key={role} className="text-center">
                      <Switch checked={get(role, key)} onCheckedChange={(v) => toggle(role, key, v)} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- User role assignment ---------- */
type UserListItem = {
  id: string;
  display_name: string | null;
  email: string | null;
  roles: AppRole[];
  total_points: number;
};

function UserRoleManager() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: pts }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, email").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_points").select("user_id, total_points"),
    ]);

    const roleMap = new Map<string, AppRole[]>();
    for (const r of (roles ?? []) as { user_id: string; role: AppRole }[]) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const ptsMap = new Map<string, number>();
    for (const p of (pts ?? []) as { user_id: string; total_points: number }[]) {
      ptsMap.set(p.user_id, p.total_points);
    }

    setUsers((profs ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      email: p.email,
      roles: roleMap.get(p.id) ?? ["user"],
      total_points: ptsMap.get(p.id) ?? 0,
    })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const toggleRole = async (userId: string, role: AppRole, currentlyHas: boolean) => {
    if (currentlyHas) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(friendlyError(error));
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(friendlyError(error));
    }
    toast.success("עודכן");
    void load();
  };

  const filtered = users.filter(u =>
    !search ||
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>דרגות משתמשים ({filtered.length})</CardTitle>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש שם / אימייל..." className="max-w-sm" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>משתמש</TableHead>
              <TableHead>נקודות</TableHead>
              {ROLES.map(r => (
                <TableHead key={r} className="text-center">
                  <div className="flex flex-col items-center gap-1">{ROLE_ICONS[r]}<span className="text-xs">{ROLE_LABELS[r]}</span></div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? ""}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{u.total_points}</Badge></TableCell>
                {ROLES.map(role => {
                  const has = u.roles.includes(role);
                  return (
                    <TableCell key={role} className="text-center">
                      <Switch checked={has} onCheckedChange={() => toggleRole(u.id, role, has)} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- Points rules ---------- */
function PointsRulesEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({ event_key: "", label: "", points: 10 });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("points_rules").select("*").order("event_key");
    if (error) toast.error(friendlyError(error));
    setRules((data ?? []) as Rule[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const update = (id: string, patch: Partial<Rule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const r of rules) {
      const { error } = await supabase.from("points_rules").update({
        label: r.label, points: r.points, enabled: r.enabled,
      }).eq("id", r.id);
      if (error) { toast.error(friendlyError(error)); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("כל הכללים נשמרו");
  };

  const addRule = async () => {
    if (!newRule.event_key.trim() || !newRule.label.trim()) {
      toast.error("יש למלא מפתח ושם");
      return;
    }
    const { error } = await supabase.from("points_rules").insert({
      event_key: newRule.event_key.trim().toLowerCase(),
      label: newRule.label.trim(),
      points: newRule.points,
    });
    if (error) return toast.error(friendlyError(error));
    setNewRule({ event_key: "", label: "", points: 10 });
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("points_rules").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    void load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>הוספת כלל חדש</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>מפתח אירוע</Label>
            <Input value={newRule.event_key} onChange={e => setNewRule(s => ({ ...s, event_key: e.target.value }))} placeholder="לדוגמה: forum_post" />
          </div>
          <div>
            <Label>שם להצגה</Label>
            <Input value={newRule.label} onChange={e => setNewRule(s => ({ ...s, label: e.target.value }))} placeholder="פרסום בפורום" />
          </div>
          <div>
            <Label>נקודות</Label>
            <Input type="number" value={newRule.points} onChange={e => setNewRule(s => ({ ...s, points: Number(e.target.value) || 0 }))} />
          </div>
          <div className="flex items-end">
            <Button onClick={addRule} className="w-full"><Plus className="ml-1 h-4 w-4" />הוסף</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>כללי נקודות ({rules.length})</CardTitle>
          <Button onClick={saveAll} disabled={saving} size="sm">
            {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
            שמור הכל
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מפתח</TableHead>
                <TableHead>שם</TableHead>
                <TableHead className="w-32">נקודות</TableHead>
                <TableHead className="w-24 text-center">פעיל</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.event_key}</TableCell>
                  <TableCell>
                    <Input value={r.label} onChange={e => update(r.id, { label: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={r.points} onChange={e => update(r.id, { points: Number(e.target.value) || 0 })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
