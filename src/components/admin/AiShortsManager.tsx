import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, RefreshCw, Sparkles, Youtube, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Source = {
  id: string;
  channel_name: string;
  channel_id: string;
  is_active: boolean;
  created_at: string;
};

type AiShort = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  channel_name: string | null;
  approval_status: string;
  created_at: string;
};

export function AiShortsManager() {
  const [ingesting, setIngesting] = useState(false);

  const runIngest = async () => {
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-ai-shorts", { body: {} });
      if (error) throw error;
      toast.success(`הוזנו ${data?.inserted ?? 0} שורטס חדשים מתוך ${data?.fetched ?? 0}`);
    } catch (e: any) {
      toast.error(e?.message ?? "שגיאת ההזנה");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" /> מנוע AI לשורטס יוטיוב
          </h3>
          <p className="text-xs text-muted-foreground">
            שואב סרטונים מערוצי יוטיוב, מתרגם לעברית עם AI, ומציג בתור אישור.
          </p>
        </div>
        <Button onClick={runIngest} disabled={ingesting} className="bg-amber-500 text-black hover:bg-amber-400">
          <RefreshCw className={`h-4 w-4 ml-1 ${ingesting ? "animate-spin" : ""}`} />
          {ingesting ? "מושך תוכן..." : "הרץ הזנה עכשיו"}
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">⏳ תור אישור</TabsTrigger>
          <TabsTrigger value="sources">📺 ערוצי מקור</TabsTrigger>
          <TabsTrigger value="approved">✅ מאושרים</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PendingQueue />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <SourcesPanel />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ApprovedList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourcesPanel() {
  const [rows, setRows] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("shorts_sources")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Source[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim() || !channelId.trim()) {
      toast.error("חובה לציין שם ערוץ ומזהה");
      return;
    }
    const { error } = await (supabase as any).from("shorts_sources").insert({
      channel_name: name.trim(),
      channel_id: channelId.trim(),
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("הערוץ נוסף");
    setName(""); setChannelId("");
    load();
  };

  const toggle = async (id: string, val: boolean) => {
    const { error } = await (supabase as any)
      .from("shorts_sources").update({ is_active: val }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((p) => p.map((r) => r.id === id ? { ...r, is_active: val } : r));
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הערוץ?")) return;
    const { error } = await (supabase as any).from("shorts_sources").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">שם הערוץ</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: Music Tech HQ" />
          </div>
          <div>
            <Label className="text-xs">YouTube Channel ID</Label>
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="UCxxxxxxxxxxxxxxxxxx" />
          </div>
        </div>
        <Button onClick={add} className="bg-amber-500 text-black hover:bg-amber-400">
          <Plus className="h-4 w-4 ml-1" /> הוסף ערוץ
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">טוען...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 border border-dashed border-amber-500/20 rounded-xl">
          אין ערוצים מוגדרים. הוסף ערוץ כדי להתחיל.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-card p-3">
              <Youtube className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.channel_name}</div>
                <div className="text-xs text-muted-foreground truncate font-mono">{r.channel_id}</div>
              </div>
              <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.id, v)} />
              <Button variant="destructive" size="sm" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingQueue() {
  const [rows, setRows] = useState<AiShort[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("musician_shorts")
      .select("*")
      .eq("approval_status", "pending_review")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as AiShort[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await (supabase as any)
      .from("musician_shorts").update({ approval_status: "approved" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("פורסם");
    setRows((p) => p.filter((r) => r.id !== id));
  };
  const reject = async (id: string) => {
    const { error } = await (supabase as any)
      .from("musician_shorts").update({ approval_status: "rejected" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נדחה");
    setRows((p) => p.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">טוען...</div>;
  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border border-dashed border-amber-500/20 rounded-xl">
        אין שורטס בהמתנה. לחץ "הרץ הזנה עכשיו" כדי לשאוב סרטונים חדשים.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-amber-500/20 bg-card overflow-hidden">
          <div className="aspect-[9/16] bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${r.youtube_video_id}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={r.title}
            />
          </div>
          <div className="p-3 space-y-2">
            <div className="font-bold text-sm line-clamp-2">{r.title}</div>
            {r.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">{r.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {r.channel_name && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                  {r.channel_name}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString("he-IL")}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => reject(r.id)}>
                <X className="h-4 w-4 ml-1" /> דחה
              </Button>
              <Button size="sm" className="flex-1 bg-amber-500 text-black hover:bg-amber-400" onClick={() => approve(r.id)}>
                <Check className="h-4 w-4 ml-1" /> אשר
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovedList() {
  const [rows, setRows] = useState<AiShort[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("musician_shorts")
      .select("*")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as AiShort[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("למחוק לצמיתות?")) return;
    const { error } = await (supabase as any).from("musician_shorts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((p) => p.filter((r) => r.id !== id));
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">טוען...</div>;
  if (rows.length === 0) {
    return <div className="text-center text-muted-foreground py-8">אין שורטס מאושרים עדיין.</div>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-card p-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{r.title}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {r.channel_name && <span>{r.channel_name}</span>}
              <span>·</span>
              <span>{new Date(r.created_at).toLocaleDateString("he-IL")}</span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`https://www.youtube.com/watch?v=${r.youtube_video_id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 ml-1" /> צפה
            </a>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => remove(r.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
