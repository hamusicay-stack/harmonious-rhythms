import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Trash2, Crown, ShieldCheck, Plus, Eye, Play, Upload, Calendar, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShortsAnalyticsPanel } from "@/components/admin/ShortsAnalyticsPanel";
import { WhatsAppIngestConfig } from "@/components/admin/WhatsAppIngestConfig";
import { toast } from "sonner";

type Short = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  creator_id: string;
  status: string;
  is_premium: boolean;
  views_count: number;
  created_at: string;
  scheduled_for: string | null;
  admin_notes: string | null;
};

type Trusted = {
  id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
};

export function ShortsManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-primary" />ניהול שורטס</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Tabs defaultValue="queue" dir="rtl">
          <TabsList className="flex w-full h-auto gap-1 overflow-x-auto md:grid md:grid-cols-5">
            <TabsTrigger value="queue" className="shrink-0 text-xs sm:text-sm">תור אישור</TabsTrigger>
            <TabsTrigger value="upload" className="shrink-0 text-xs sm:text-sm">העלאה מרובה</TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 text-xs sm:text-sm">אנליטיקס</TabsTrigger>
            <TabsTrigger value="trusted" className="shrink-0 text-xs sm:text-sm">מאושרים</TabsTrigger>
            <TabsTrigger value="settings" className="shrink-0 text-xs sm:text-sm">הגדרות</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4"><ApprovalQueue /></TabsContent>
          <TabsContent value="upload" className="mt-4 space-y-4"><BulkUploader /><WhatsAppIngestConfig /></TabsContent>
          <TabsContent value="analytics" className="mt-4"><ShortsAnalyticsPanel /></TabsContent>
          <TabsContent value="trusted" className="mt-4"><TrustedUploaders /></TabsContent>
          <TabsContent value="settings" className="mt-4"><ShortsSettings /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ApprovalQueue() {
  const [items, setItems] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "active" | "scheduled" | "rejected">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("shorts_videos")
      .select("id,title,description,video_url,thumbnail_url,creator_id,status,is_premium,views_count,created_at,scheduled_for,admin_notes")
      .eq("status", filter)
      .order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as Short[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("shorts_videos").update({
      status: "active", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), scheduled_for: null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("הסרטון אושר"); load();
  };

  const reject = async (id: string) => {
    const reason = prompt("סיבת דחייה (אופציונלי):") ?? "";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("shorts_videos").update({
      status: "rejected", admin_notes: reason || null,
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נדחה"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק לחלוטין?")) return;
    const { error } = await supabase.from("shorts_videos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["pending", "scheduled", "active", "rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "ממתינים" : s === "active" ? "פעילים" : s === "scheduled" ? "מתוזמנים" : "דחויים"}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">אין סרטונים בקטגוריה זו</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((v) => (
            <div key={v.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="aspect-[9/16] bg-black relative">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={v.video_url} className="w-full h-full object-cover" muted />
                )}
                {v.is_premium && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                    <Crown className="ml-1 h-3 w-3" />Premium
                  </Badge>
                )}
                {v.status === "scheduled" && v.scheduled_for && (
                  <Badge className="absolute top-2 left-2 bg-blue-500 text-white text-[10px]">
                    <Calendar className="ml-1 h-3 w-3" />
                    {new Date(v.scheduled_for).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                <div className="font-semibold text-xs line-clamp-1">{v.title || "ללא כותרת"}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Eye className="h-3 w-3" />{v.views_count}
                  <span>·</span>
                  <span>{new Date(v.created_at).toLocaleDateString("he-IL")}</span>
                </div>
                {v.admin_notes && <div className="text-[10px] text-rose-500 line-clamp-1">סיבה: {v.admin_notes}</div>}
                <div className="flex gap-1 pt-1">
                  {filter !== "active" && (
                    <Button size="sm" className="flex-1 h-7 text-xs px-1" onClick={() => approve(v.id)}>
                      <CheckCircle2 className="h-3 w-3" />אישור
                    </Button>
                  )}
                  {filter !== "rejected" && (
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs px-1" onClick={() => reject(v.id)}>
                      <XCircle className="h-3 w-3" />דחייה
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(v.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Pending = {
  file: File;
  id: string;
  title: string;
  description: string;
  scheduledAt: string; // datetime-local format, optional
  status: "ready" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

function BulkUploader() {
  const [items, setItems] = useState<Pending[]>([]);
  const [defaultSchedule, setDefaultSchedule] = useState("");
  const [intervalMin, setIntervalMin] = useState<number>(60);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr: Pending[] = Array.from(files).map((f) => ({
      file: f, id: Math.random().toString(36).slice(2),
      title: f.name.replace(/\.[^.]+$/, ""), description: "",
      scheduledAt: "", status: "ready" as const, progress: 0,
    }));
    setItems((p) => [...p, ...arr]);
  };

  const applySchedule = () => {
    if (!defaultSchedule) { toast.error("בחר תאריך התחלה"); return; }
    const start = new Date(defaultSchedule).getTime();
    if (isNaN(start)) { toast.error("תאריך לא תקין"); return; }
    setItems((prev) => prev.map((it, i) => ({
      ...it,
      scheduledAt: new Date(start + i * intervalMin * 60_000).toISOString().slice(0, 16),
    })));
    toast.success(`נקבע תזמון לכל ${items.length} הסרטונים`);
  };

  const updateItem = (id: string, patch: Partial<Pending>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));

  const uploadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("יש להתחבר"); return; }
    setUploading(true);
    for (const it of items) {
      if (it.status === "done") continue;
      updateItem(it.id, { status: "uploading", progress: 10 });
      try {
        const ext = it.file.name.split(".").pop()?.toLowerCase() ?? "mp4";
        const path = `${user.id}/admin-bulk/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("shorts").upload(path, it.file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        updateItem(it.id, { progress: 70 });
        const { data: pub } = supabase.storage.from("shorts").getPublicUrl(path);
        const scheduled = it.scheduledAt ? new Date(it.scheduledAt).toISOString() : null;
        const isFuture = scheduled && new Date(scheduled).getTime() > Date.now();
        const { error: insErr } = await supabase.from("shorts_videos").insert([{
          creator_id: user.id,
          video_url: pub.publicUrl,
          title: it.title || it.file.name,
          description: it.description || null,
          scheduled_for: scheduled,
          status: (isFuture ? "scheduled" : "active") as "scheduled" | "active",
        }]);
        if (insErr) throw insErr;
        updateItem(it.id, { status: "done", progress: 100 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "שגיאה";
        updateItem(it.id, { status: "error", error: msg, progress: 0 });
      }
    }
    setUploading(false);
    toast.success("הסתיים");
  };

  const clearDone = () => setItems((p) => p.filter((i) => i.status !== "done"));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="h-4 w-4 text-primary" />העלאת סרטונים מרובה (האדמין כיוצר)
        </div>
        <input ref={inputRef} type="file" accept="video/*" multiple className="hidden"
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        <Button onClick={() => inputRef.current?.click()} variant="outline" className="w-full">
          <Plus className="h-4 w-4" />בחר קבצי וידאו
        </Button>

        {items.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto] items-end border-t pt-3">
            <div>
              <Label className="text-xs">תזמון אוטומטי לכולם — תאריך התחלה</Label>
              <Input type="datetime-local" value={defaultSchedule} onChange={(e) => setDefaultSchedule(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">מרווח בין סרטונים (דקות)</Label>
              <Input type="number" min={0} value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value) || 0)} />
            </div>
            <Button variant="secondary" onClick={applySchedule}><Calendar className="h-4 w-4" />החל תזמון</Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">לא נבחרו סרטונים</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">{it.file.name}</div>
                  <Input placeholder="כותרת" value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} className="h-8 text-sm" />
                  <Input placeholder="תיאור (אופציונלי)" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} className="h-8 text-sm" />
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <Input type="datetime-local" value={it.scheduledAt} onChange={(e) => updateItem(it.id, { scheduledAt: e.target.value })} className="h-8 text-xs flex-1" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {it.status === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {it.status === "uploading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {it.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(it.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {it.error && <p className="text-xs text-destructive">{it.error}</p>}
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={uploadAll} disabled={uploading} className="flex-1">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            העלה הכל ({items.filter((i) => i.status !== "done").length})
          </Button>
          <Button variant="outline" onClick={clearDone}>נקה מושלמים</Button>
        </div>
      )}
    </div>
  );
}

function ShortsSettings() {
  const [autoAll, setAutoAll] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("shorts_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAutoAll(!!data.auto_approve_all);
          setRequireApproval(!!data.require_approval);
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const { error } = await supabase.from("shorts_settings").update({
      auto_approve_all: autoAll, require_approval: requireApproval, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("ההגדרות נשמרו");
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" />;

  return (
    <div className="space-y-4 rounded-xl border p-5 bg-card-elevated">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="font-semibold">דרוש אישור מנהל</Label>
          <p className="text-xs text-muted-foreground">סרטונים חדשים נכנסים לתור עד לאישור</p>
        </div>
        <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <div>
          <Label className="font-semibold">אישור אוטומטי לכולם</Label>
          <p className="text-xs text-muted-foreground">כל סרטון יעלה אוטומטית ללא בדיקה (מעקף את ההגדרה למעלה)</p>
        </div>
        <Switch checked={autoAll} onCheckedChange={setAutoAll} />
      </div>
      <Button onClick={save} className="w-full">שמור הגדרות</Button>
    </div>
  );
}

function TrustedUploaders() {
  const [items, setItems] = useState<(Trusted & { display_name: string | null; email: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: trusted } = await supabase.from("shorts_trusted_uploaders").select("*").order("created_at", { ascending: false });
    const ids = (trusted ?? []).map((t) => t.user_id);
    let map: Record<string, { display_name: string | null; email: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      for (const p of profs ?? []) map[p.id] = { display_name: p.display_name, email: p.email };
    }
    setItems((trusted ?? []).map((t) => ({ ...t, ...(map[t.user_id] ?? { display_name: null, email: null }) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!email.trim()) return;
    setAdding(true);
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!prof) { toast.error("משתמש לא נמצא — חייב להיות רשום באתר"); setAdding(false); return; }
    const { error } = await supabase.from("shorts_trusted_uploaders").insert({ user_id: prof.id, reason: reason || null });
    if (error) toast.error(error.message);
    else { toast.success("נוסף לרשימה"); setEmail(""); setReason(""); load(); }
    setAdding(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shorts_trusted_uploaders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("הוסר"); load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 bg-card-elevated space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />הוסף משתמש מהימן
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="סיבה (אופציונלי)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={add} disabled={adding}><Plus className="h-4 w-4" />הוסף</Button>
        </div>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>משתמש</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>סיבה</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.display_name || "—"}</TableCell>
                  <TableCell className="text-xs">{t.email || "—"}</TableCell>
                  <TableCell className="text-xs">{t.reason || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell className="text-end">
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">אין מעלים מהימנים</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
