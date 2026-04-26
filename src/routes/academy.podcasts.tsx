import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Mic, Plus, Youtube, Upload, Headphones, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type Podcast = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  source_url: string;
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
};

function PodcastsPage() {
  const { user, isAdmin } = useAuth();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "",
    kind: "youtube" as "youtube" | "audio" | "video",
    source_url: "", thumbnail_url: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_podcasts").select("*")
      .eq("is_active", true).order("sort_order").order("created_at", { ascending: false });
    setPodcasts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.source_url.trim()) return toast.error("נא למלא כותרת וקישור");
    const { error } = await supabase.from("academy_podcasts").insert({
      title: form.title, description: form.description || null,
      kind: form.kind, source_url: form.source_url,
      thumbnail_url: form.thumbnail_url || null, created_by: user?.id,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("הפודקאסט נוסף");
    setOpen(false);
    setForm({ title: "", description: "", kind: "youtube", source_url: "", thumbnail_url: "" });
    load();
  };

  const ytEmbed = (url: string) => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  const share = (p: Podcast) => {
    const url = window.location.href + "#" + p.id;
    if (navigator.share) navigator.share({ title: p.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">פודקאסטים</h1>
              <p className="text-sm text-muted-foreground">תוכן אודיו ווידאו מהמובילים בתחום</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="me-2 h-4 w-4" />הוסף</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>פודקאסט חדש</DialogTitle></DialogHeader>
                <div className="space-y-3">
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
          )}
        </div>

        {loading ? <p className="text-center text-muted-foreground">טוען...</p>
        : podcasts.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">אין פודקאסטים עדיין</CardContent></Card>
        : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((p) => (
              <Card key={p.id} id={p.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {p.kind === "youtube" ? (
                    <iframe src={ytEmbed(p.source_url)} className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
                  ) : p.kind === "audio" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 to-accent/20 p-4">
                      {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} className="h-20 w-20 rounded-lg object-cover" />}
                      <Headphones className="h-8 w-8 text-primary" />
                      <audio src={p.source_url} controls className="w-full" onPlay={() => supabase.from("academy_podcasts").update({ views_count: p.views_count + 1 }).eq("id", p.id)} />
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
                      {p.kind === "youtube" ? "YouTube" : p.kind === "audio" ? "אודיו" : "וידאו"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => share(p)}><Share2 className="h-4 w-4" /></Button>
                  </div>
                  <h3 className="font-semibold">{p.title}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
