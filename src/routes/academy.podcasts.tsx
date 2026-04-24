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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Plus, Youtube, Upload } from "lucide-react";
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
  source_type: "youtube" | "upload";
  source_url: string;
  cover_url: string | null;
  created_at: string;
};

function PodcastsPage() {
  const { user, isAdmin } = useAuth();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source_type: "youtube" as "youtube" | "upload",
    source_url: "",
    cover_url: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_podcasts")
      .select("*")
      .order("created_at", { ascending: false });
    setPodcasts((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.source_url.trim()) {
      toast.error("נא למלא כותרת וקישור");
      return;
    }
    const { error } = await supabase.from("academy_podcasts").insert({
      title: form.title,
      description: form.description || null,
      source_type: form.source_type,
      source_url: form.source_url,
      cover_url: form.cover_url || null,
      created_by: user?.id,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("הפודקאסט נוסף");
    setOpen(false);
    setForm({ title: "", description: "", source_type: "youtube", source_url: "", cover_url: "" });
    load();
  };

  const ytEmbed = (url: string) => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
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
              <DialogTrigger asChild>
                <Button>
                  <Plus className="me-2 h-4 w-4" /> הוסף פודקאסט
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>פודקאסט חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>כותרת</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>תיאור</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div>
                    <Label>סוג מקור</Label>
                    <Select value={form.source_type} onValueChange={(v: "youtube" | "upload") => setForm({ ...form, source_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="upload">קישור להעלאה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>קישור</Label>
                    <Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div>
                    <Label>תמונת כיסוי (URL)</Label>
                    <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                  <Button onClick={submit}>שמור</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">טוען...</p>
        ) : podcasts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">אין פודקאסטים עדיין</CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {p.source_type === "youtube" ? (
                    <iframe
                      src={ytEmbed(p.source_url)}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={p.source_url} controls className="h-full w-full" poster={p.cover_url ?? undefined} />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">
                      {p.source_type === "youtube" ? <Youtube className="me-1 h-3 w-3" /> : <Upload className="me-1 h-3 w-3" />}
                      {p.source_type === "youtube" ? "YouTube" : "העלאה"}
                    </Badge>
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
