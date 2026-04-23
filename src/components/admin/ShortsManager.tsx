import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, Trash2, Crown, ShieldCheck, Plus, Eye, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
      <CardContent>
        <Tabs defaultValue="queue" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue">תור אישור</TabsTrigger>
            <TabsTrigger value="trusted">מעלים מאושרים</TabsTrigger>
            <TabsTrigger value="settings">הגדרות</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4"><ApprovalQueue /></TabsContent>
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
  const [filter, setFilter] = useState<"pending" | "active" | "rejected">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("shorts_videos")
      .select("id,title,description,video_url,thumbnail_url,creator_id,status,is_premium,views_count,created_at,admin_notes")
      .eq("status", filter)
      .order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as Short[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("shorts_videos").update({
      status: "active", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("הסרטון אושר");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("סיבת דחייה (אופציונלי):") ?? "";
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("shorts_videos").update({
      status: "rejected", admin_notes: reason || null,
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נדחה");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק לחלוטין?")) return;
    const { error } = await supabase.from("shorts_videos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["pending", "active", "rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "pending" ? "ממתינים" : s === "active" ? "פעילים" : "דחויים"}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">אין סרטונים בקטגוריה זו</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
              <div className="p-3 space-y-2">
                <div className="font-semibold text-sm line-clamp-1">{v.title || "ללא כותרת"}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{v.description}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />{v.views_count}
                  <span>·</span>
                  <span>{new Date(v.created_at).toLocaleDateString("he-IL")}</span>
                </div>
                {v.admin_notes && <div className="text-xs text-rose-500">סיבה: {v.admin_notes}</div>}
                <div className="flex gap-1.5 pt-1">
                  {filter !== "active" && (
                    <Button size="sm" className="flex-1 h-8" onClick={() => approve(v.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />אישור
                    </Button>
                  )}
                  {filter !== "rejected" && (
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => reject(v.id)}>
                      <XCircle className="h-3.5 w-3.5" />דחייה
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => remove(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
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
    toast.success("הוסר");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 bg-card-elevated space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />הוסף משתמש מהימן (אישור אוטומטי)
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="סיבה (אופציונלי)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={add} disabled={adding}><Plus className="h-4 w-4" />הוסף</Button>
        </div>
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" /> : (
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
      )}
    </div>
  );
}
