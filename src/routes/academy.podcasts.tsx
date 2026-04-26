import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Plus, Youtube, Upload, Headphones, Share2, FolderOpen, ArrowRight, Download, Trash2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyRealtime } from "@/hooks/useAcademyRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/academy/podcasts")({
  head: () => ({
    meta: [
      { title: "פודקאסטים — האקדמיה" },
      { name: "description", content: "פודקאסטים והרצאות מהמובילים בתחום המוזיקה." },
    ],
  }),
  component: PodcastsPage,
});

type Series = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  host_name: string | null;
  youtube_playlist_url: string | null;
  is_active: boolean;
};

type Podcast = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  source_url: string;
  thumbnail_url: string | null;
  views_count: number;
  series_id: string | null;
  episode_number: number | null;
  sort_order: number;
  created_at: string;
};

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host.endsWith("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const marker = ["embed", "shorts", "live"].find((part) => parts.includes(part));
      if (marker) return parts[parts.indexOf(marker) + 1] ?? null;
    }
  } catch {
    return url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;
  }
  return null;
}

function youtubePlaylistId(url: string) {
  try {
    return new URL(url).searchParams.get("list");
  } catch {
    return url.match(/[?&]list=([\w-]+)/)?.[1] ?? null;
  }
}

function ytEmbed(url: string) {
  const videoId = youtubeVideoId(url);
  const playlistId = youtubePlaylistId(url);
  if (videoId) {
    const listParam = playlistId ? `&list=${playlistId}` : "";
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${listParam}`;
  }
  if (playlistId) return `https://www.youtube.com/embed/videoseries?list=${playlistId}&rel=0&modestbranding=1`;
  return null;
}

function PodcastsPage() {
  const { user, isAdmin } = useAuth();
  const [series, setSeries] = useState<Series[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("academy_podcast_series").select("*").eq("is_active", true).order("sort_order").order("created_at", { ascending: false }),
      supabase.from("academy_podcasts").select("*").eq("is_active", true).order("sort_order").order("episode_number", { nullsFirst: false }).order("created_at", { ascending: false }),
    ]);
    setSeries((s.data as any) ?? []);
    setPodcasts((p.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useAcademyRealtime(["academy_podcasts", "academy_podcast_series"], () => { load(); });

  const standalone = useMemo(() => podcasts.filter(p => !p.series_id), [podcasts]);
  const bySeries = useMemo(() => {
    const map = new Map<string, Podcast[]>();
    for (const p of podcasts) if (p.series_id) {
      if (!map.has(p.series_id)) map.set(p.series_id, []);
      map.get(p.series_id)!.push(p);
    }
    for (const items of map.values()) {
      items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.episode_number ?? 9999) - (b.episode_number ?? 9999));
    }
    return map;
  }, [podcasts]);

  const activeSeries = openSeries ? series.find(s => s.id === openSeries) : null;
  const activeEpisodes = openSeries ? (bySeries.get(openSeries) ?? []) : [];

  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (!fromHash || !podcasts.length) return;
    const podcast = podcasts.find((p) => p.id === fromHash);
    if (podcast?.series_id) setOpenSeries(podcast.series_id);
    requestAnimationFrame(() => document.getElementById(fromHash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [podcasts]);

  const share = (p: Podcast) => {
    const url = window.location.href + "#" + p.id;
    if (navigator.share) navigator.share({ title: p.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  // Inside-series view
  if (activeSeries) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => setOpenSeries(null)} className="mb-4">
            <ArrowRight className="me-2 h-4 w-4" />חזרה לכל הפודקאסטים
          </Button>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
            {activeSeries.cover_url && (
              <img src={activeSeries.cover_url} alt={activeSeries.title}
                className="h-32 w-32 rounded-2xl object-cover shadow-lg" />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{activeSeries.title}</h1>
              {activeSeries.host_name && <p className="text-muted-foreground">מנחה: {activeSeries.host_name}</p>}
              {activeSeries.description && <p className="mt-2 text-sm text-muted-foreground">{activeSeries.description}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{activeEpisodes.length} פרקים</p>
            </div>
            {isAdmin && <SeriesAdminControls series={activeSeries} onChange={load} />}
          </div>

          {activeEpisodes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              אין עדיין פרקים בסדרה הזו{isAdmin && " — הוסף קישור פלייליסט יוטיוב כדי לייבא אוטומטית"}
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {activeEpisodes.map((p) => <EpisodeCard key={p.id} p={p} share={share} />)}
            </div>
          )}
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">פודקאסטים</h1>
              <p className="text-sm text-muted-foreground">סדרות, פרקים ופלייליסטים מהמובילים בתחום</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <NewSeriesDialog onCreated={load} />
              <NewEpisodeDialog seriesList={series} onCreated={load} userId={user?.id} />
            </div>
          )}
        </div>

        {loading ? <p className="text-center text-muted-foreground">טוען...</p>
        : series.length === 0 && standalone.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">אין פודקאסטים עדיין</CardContent></Card>
        ) : (
          <>
            {series.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-semibold">תיקיות פודקאסטים</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {series.map((s) => {
                    const count = bySeries.get(s.id)?.length ?? 0;
                    return (
                      <button key={s.id} onClick={() => setOpenSeries(s.id)}
                        className="group overflow-hidden rounded-2xl border bg-card text-start shadow-sm transition hover:border-primary/40 hover:shadow-lg">
                        <div className="aspect-video bg-gradient-to-br from-primary/30 to-accent/30 relative">
                          {s.cover_url ? (
                            <img src={s.cover_url} alt={s.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center"><FolderOpen className="h-16 w-16 text-primary/60" /></div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-3">
                            <Badge variant="secondary" className="gap-1"><FolderOpen className="h-3 w-3" />{count} פרקים</Badge>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold line-clamp-1">{s.title}</h3>
                          {s.host_name && <p className="text-xs text-muted-foreground line-clamp-1">{s.host_name}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {standalone.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold">פרקים בודדים</h2>
                <div className="space-y-3">
                  {standalone.map((p) => <EpisodeCard key={p.id} p={p} share={share} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function EpisodeCard({ p, share }: { p: Podcast; share: (p: Podcast) => void }) {
  const youtubeEmbed = p.kind === "youtube" ? ytEmbed(p.source_url) : null;
  const [expanded, setExpanded] = useState(false);
  return (
    <Card id={p.id} className="overflow-hidden scroll-mt-24">
      <div className="grid gap-0 md:grid-cols-[minmax(260px,420px)_1fr]">
      <div className="aspect-video bg-muted md:h-full md:min-h-52">
        {youtubeEmbed && expanded ? (
          <iframe src={`${youtubeEmbed}&autoplay=1`} title={p.title} className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen />
        ) : youtubeEmbed ? (
          <button type="button" onClick={() => setExpanded(true)} className="relative h-full w-full overflow-hidden text-start">
            {p.thumbnail_url ? (
              <img src={p.thumbnail_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-background/20">
              <span className="rounded-full bg-background/90 p-4 shadow-lg"><PlayCircle className="h-8 w-8 fill-primary text-primary" /></span>
            </span>
          </button>
        ) : p.kind === "audio" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 to-accent/20 p-4">
            {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} className="h-20 w-20 rounded-lg object-cover" />}
            <Headphones className="h-8 w-8 text-primary" />
            <audio src={p.source_url} controls className="w-full"
              onPlay={() => supabase.from("academy_podcasts").update({ views_count: p.views_count + 1 }).eq("id", p.id)} />
          </div>
        ) : (
          <video src={p.source_url} controls className="h-full w-full" poster={p.thumbnail_url ?? undefined} />
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="secondary">
            {p.kind === "youtube" ? <Youtube className="me-1 h-3 w-3" /> :
             p.kind === "audio" ? <Headphones className="me-1 h-3 w-3" /> :
             <Upload className="me-1 h-3 w-3" />}
            {p.episode_number ? `פרק ${p.episode_number}` : (p.kind === "youtube" ? "YouTube" : p.kind === "audio" ? "אודיו" : "וידאו")}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => share(p)}><Share2 className="h-4 w-4" /></Button>
        </div>
        <h3 className="font-semibold line-clamp-2">{p.title}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
      </CardContent>
      </div>
    </Card>
  );
}

function NewSeriesDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", host_name: "", cover_url: "" });
  const submit = async () => {
    if (!form.title.trim()) return toast.error("נא למלא כותרת");
    const { error } = await supabase.from("academy_podcast_series").insert({
      title: form.title, description: form.description || null,
      host_name: form.host_name || null, cover_url: form.cover_url || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("סדרה נוצרה");
    setOpen(false);
    setForm({ title: "", description: "", host_name: "", cover_url: "" });
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><FolderOpen className="me-2 h-4 w-4" />סדרה חדשה</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>סדרת פודקאסט חדשה</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>שם הסדרה</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>שם המנחה</Label><Input value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} /></div>
          <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>תמונת כיסוי (URL)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={submit}>צור סדרה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewEpisodeDialog({ seriesList, onCreated, userId }: { seriesList: Series[]; onCreated: () => void; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", kind: "youtube" as "youtube" | "audio" | "video",
    source_url: "", thumbnail_url: "", series_id: "none",
  });
  const submit = async () => {
    if (!form.title.trim() || !form.source_url.trim()) return toast.error("נא למלא כותרת וקישור");
    const { error } = await supabase.from("academy_podcasts").insert({
      title: form.title, description: form.description || null,
      kind: form.kind, source_url: form.source_url,
      thumbnail_url: form.thumbnail_url || null,
      series_id: form.series_id === "none" ? null : form.series_id,
      created_by: userId,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("הפרק נוסף");
    setOpen(false);
    setForm({ title: "", description: "", kind: "youtube", source_url: "", thumbnail_url: "", series_id: "none" });
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />פרק חדש</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>פרק / פודקאסט חדש</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>שייך לסדרה (אופציונלי)</Label>
            <Select value={form.series_id} onValueChange={(v) => setForm({ ...form, series_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא סדרה</SelectItem>
                {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>כותרת</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>סוג</Label>
            <Select value={form.kind} onValueChange={(v: any) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="audio">אודיו (MP3)</SelectItem>
                <SelectItem value="video">וידאו (MP4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>קישור</Label><Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>תמונת כיסוי (URL)</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={submit}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeriesAdminControls({ series, onChange }: { series: Series; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState(series.youtube_playlist_url ?? "");
  const [importing, setImporting] = useState(false);

  const importPlaylist = async () => {
    if (!playlistUrl.trim()) return toast.error("נא להזין קישור פלייליסט");
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-youtube-playlist", {
        body: { series_id: series.id, playlist_url: playlistUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`יובאו ${data.imported} פרקים מתוך ${data.total}`);
      setOpen(false);
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "שגיאה בייבוא");
    } finally {
      setImporting(false);
    }
  };

  const removeSeries = async () => {
    if (!confirm("למחוק את הסדרה ואת כל הפרקים שבתוכה?")) return;
    const { error } = await supabase.from("academy_podcast_series").delete().eq("id", series.id);
    if (error) return toast.error(error.message);
    toast.success("הסדרה וכל הפרקים נמחקו");
    onChange();
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline"><Download className="me-2 h-4 w-4" />ייבוא מפלייליסט יוטיוב</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>ייבוא פלייליסט יוטיוב</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              הדבק קישור לפלייליסט ציבורי של יוטיוב. כל הפרקים ייובאו אוטומטית עם שם, תיאור ותמונה.
            </p>
            <div>
              <Label>קישור פלייליסט</Label>
              <Input value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>ביטול</Button>
            <Button onClick={importPlaylist} disabled={importing}>
              {importing ? "מייבא..." : "ייבא"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button variant="ghost" size="icon" onClick={removeSeries}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}
