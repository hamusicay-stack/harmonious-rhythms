import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Rss, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Source = {
  id: string;
  site_name: string;
  rss_url: string;
  is_active: boolean;
  created_at: string;
};

export function NewsSourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("news_sources")
      .select("id, site_name, rss_url, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(friendlyError(error, "טעינת המקורות נכשלה"));
    } else {
      setSources((data ?? []) as Source[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = siteName.trim();
    const url = rssUrl.trim();
    if (name.length < 2) {
      toast.error("יש להזין שם אתר");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("כתובת RSS לא תקינה");
      return;
    }
    setAdding(true);
    const { data, error } = await (supabase as any)
      .from("news_sources")
      .insert({ site_name: name, rss_url: url, is_active: true })
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast.error(friendlyError(error, "הוספת המקור נכשלה"));
      return;
    }
    setSources((p) => [data as Source, ...p]);
    setSiteName("");
    setRssUrl("");
    toast.success("המקור נוסף בהצלחה ✨");
  };

  const toggleActive = async (s: Source, value: boolean) => {
    setSources((p) => p.map((x) => (x.id === s.id ? { ...x, is_active: value } : x)));
    const { error } = await (supabase as any)
      .from("news_sources")
      .update({ is_active: value })
      .eq("id", s.id);
    if (error) {
      setSources((p) => p.map((x) => (x.id === s.id ? { ...x, is_active: !value } : x)));
      toast.error(friendlyError(error, "עדכון הסטטוס נכשל"));
    }
  };

  const remove = async (s: Source) => {
    if (!confirm(`למחוק את "${s.site_name}"?`)) return;
    const prev = sources;
    setSources((p) => p.filter((x) => x.id !== s.id));
    const { error } = await (supabase as any).from("news_sources").delete().eq("id", s.id);
    if (error) {
      setSources(prev);
      toast.error(friendlyError(error, "המחיקה נכשלה"));
      return;
    }
    toast.success("המקור נמחק");
  };

  return (
    <div className="rounded-xl border border-gold/20 bg-card/60 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-gold/10 ring-1 ring-gold/30">
          <Rss className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-gradient-gold">מקורות RSS</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ניהול אתרי המקור שמהם מנוע ה-AI שואב כתבות לתרגום ועיבוד
          </p>
        </div>
      </div>

      <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 mb-6">
        <div>
          <Label className="text-xs">שם האתר</Label>
          <Input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            maxLength={80}
            placeholder="MusicRadar"
            className="mt-1 bg-background/60 border-gold/20"
          />
        </div>
        <div>
          <Label className="text-xs">כתובת RSS</Label>
          <Input
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            maxLength={500}
            placeholder="https://www.example.com/rss"
            className="mt-1 bg-background/60 border-gold/20 font-mono text-xs"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={adding}
            className="w-full md:w-auto bg-gold text-gold-foreground hover:bg-gold/90"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
            הוסף מקור
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          טרם הוגדרו מקורות RSS. הוסף את הראשון למעלה ⬆️
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-gold/10 bg-background/40 p-3 hover:border-gold/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{s.site_name}</span>
                  {s.is_active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">פעיל</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">מושבת</Badge>
                  )}
                </div>
                <a
                  href={s.rss_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-gold font-mono truncate inline-flex items-center gap-1 mt-0.5"
                >
                  {s.rss_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <Switch
                checked={s.is_active}
                onCheckedChange={(v) => toggleActive(s, v)}
                aria-label="הפעל/השבת"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(s)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="מחק"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
