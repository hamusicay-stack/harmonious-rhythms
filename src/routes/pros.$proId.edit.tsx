import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Trash2, Plus, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MediaUploader } from "@/components/pros/MediaUploader";
import { PackagesEditor, type EditablePackage } from "@/components/pros/PackagesEditor";
import { SPECIALTIES, GENRES, REGIONS } from "@/lib/prosData";
import { toast } from "sonner";

export const Route = createFileRoute("/pros/$proId/edit")({
  component: EditProPage,
});

type Media = { id: string; type: string; url: string; title: string | null };

function EditProPage() {
  const { proId } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pro, setPro] = useState<any>(null);
  const [packages, setPackages] = useState<EditablePackage[]>([]);
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: pk }, { data: m }] = await Promise.all([
        supabase.from("music_pros").select("*").eq("id", proId).maybeSingle(),
        supabase.from("music_pro_packages").select("*").eq("pro_id", proId).order("display_order"),
        supabase.from("music_pro_media").select("*").eq("pro_id", proId).order("display_order"),
      ]);
      setPro(p);
      setPackages((pk as EditablePackage[]) ?? []);
      setMedia((m as Media[]) ?? []);
      setLoading(false);
    })();
  }, [proId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!pro) return <div className="container mx-auto px-4 py-16 text-center">לא נמצא</div>;
  if (!isAdmin && user?.id !== pro.user_id) {
    return <div className="container mx-auto px-4 py-16 text-center">אין הרשאה</div>;
  }

  const isVip = pro.subscription_tier === "vip";
  const audioCount = media.filter((m) => m.type === "audio").length;
  const audioLimitReached = !isVip && audioCount >= 2;

  const toggle = (key: "specialties" | "genres", v: string) => {
    setPro({
      ...pro,
      [key]: pro[key].includes(v) ? pro[key].filter((x: string) => x !== v) : [...pro[key], v],
    });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("music_pros").update({
      display_name: pro.display_name,
      headline: pro.headline,
      bio: pro.bio,
      region: pro.region,
      cities: pro.cities,
      specialties: pro.specialties,
      genres: pro.genres,
      gear_list: pro.gear_list,
      brand_color: pro.brand_color,
      hourly_price_min: pro.hourly_price_min,
      profile_image: pro.profile_image,
      cover_image: pro.cover_image,
      whatsapp: pro.whatsapp,
      phone: pro.phone,
      instagram: pro.instagram,
      youtube: pro.youtube,
      website: pro.website,
    }).eq("id", proId);

    // Sync packages: delete existing, re-insert
    await supabase.from("music_pro_packages").delete().eq("pro_id", proId);
    if (packages.length > 0) {
      await supabase.from("music_pro_packages").insert(
        packages.filter((p) => p.title.trim()).map((p, i) => ({
          pro_id: proId, title: p.title, description: p.description || null,
          price: p.price, unit: p.unit, display_order: i,
        }))
      );
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר");
  };

  const addMedia = async (type: "audio" | "video", url: string, title: string) => {
    if (type === "audio" && audioLimitReached) {
      toast.error("מנוי FREE מוגבל ל-2 קבצי אודיו. שדרג ל-VIP."); return;
    }
    const { data, error } = await supabase.from("music_pro_media").insert({
      pro_id: proId, type, url, title: title || null, display_order: media.length,
    }).select("*").maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) setMedia([...media, data as Media]);
  };

  const removeMedia = async (id: string) => {
    const { error } = await supabase.from("music_pro_media").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMedia(media.filter((m) => m.id !== id));
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 text-right">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">עריכת פרופיל</h1>
        <Link to="/pros/$proId" params={{ proId }} className="text-sm text-primary hover:underline">צפה בפרופיל →</Link>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>שם תצוגה {!isAdmin && <span className="text-xs text-muted-foreground">(נעול — פנה לאדמין לשינוי)</span>}</Label>
              <Input value={pro.display_name || ""} disabled={!isAdmin} onChange={(e) => setPro({ ...pro, display_name: e.target.value })} />
            </div>
            <div><Label>כותרת</Label><Input value={pro.headline || ""} onChange={(e) => setPro({ ...pro, headline: e.target.value })} /></div>
          </div>
          <div><Label>על עצמי</Label><Textarea rows={4} value={pro.bio || ""} onChange={(e) => setPro({ ...pro, bio: e.target.value })} /></div>

          <div>
            <Label className="mb-2 block">התמחות</Label>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map((s) => (
                <button key={s.value} type="button" onClick={() => toggle("specialties", s.value)}
                  className={`rounded-full border px-3 py-1 text-xs ${pro.specialties.includes(s.value) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">סגנונות</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button key={g.value} type="button" onClick={() => toggle("genres", g.value)}
                  className={`rounded-full border px-3 py-1 text-xs ${pro.genres.includes(g.value) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>אזור</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={pro.region || ""} onChange={(e) => setPro({ ...pro, region: e.target.value })}>
                <option value="">בחר...</option>
                {REGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div><Label>ערים</Label>
              <Input value={(pro.cities || []).join(", ")} onChange={(e) => setPro({ ...pro, cities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></div>
            <div><Label>מחיר ₪</Label>
              <Input type="number" dir="ltr" value={pro.hourly_price_min || ""} onChange={(e) => setPro({ ...pro, hourly_price_min: e.target.value ? Number(e.target.value) : null })} /></div>
          </div>

          <div><Label>ציוד</Label>
            <Input value={(pro.gear_list || []).join(", ")} onChange={(e) => setPro({ ...pro, gear_list: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></div>

          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>תמונת פרופיל</Label>
              <MediaUploader folder="profile" accept="image/*" value={pro.profile_image} onChange={(url) => setPro({ ...pro, profile_image: url })} /></div>
            <div><Label>קאבר</Label>
              <MediaUploader folder="cover" accept="image/*" value={pro.cover_image} onChange={(url) => setPro({ ...pro, cover_image: url })} /></div>
          </div>

          <div>
            <Label>צבע מותג</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={pro.brand_color || "#D4A24E"} onChange={(e) => setPro({ ...pro, brand_color: e.target.value })} className="h-10 w-16 rounded border" />
              <Input dir="ltr" value={pro.brand_color || ""} onChange={(e) => setPro({ ...pro, brand_color: e.target.value })} className="max-w-[140px]" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>וואטסאפ</Label><Input dir="ltr" value={pro.whatsapp || ""} onChange={(e) => setPro({ ...pro, whatsapp: e.target.value })} /></div>
            <div><Label>טלפון</Label><Input dir="ltr" value={pro.phone || ""} onChange={(e) => setPro({ ...pro, phone: e.target.value })} /></div>
            <div><Label>Instagram</Label><Input dir="ltr" value={pro.instagram || ""} onChange={(e) => setPro({ ...pro, instagram: e.target.value })} /></div>
            <div><Label>YouTube</Label><Input dir="ltr" value={pro.youtube || ""} onChange={(e) => setPro({ ...pro, youtube: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>אתר</Label><Input dir="ltr" value={pro.website || ""} onChange={(e) => setPro({ ...pro, website: e.target.value })} /></div>
          </div>

          <div>
            <Label className="mb-2 block">חבילות מחיר</Label>
            <PackagesEditor value={packages} onChange={setPackages} />
          </div>

          <Button onClick={save} disabled={saving} size="lg" className="w-full">
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            שמור שינויים
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">תיק עבודות</h2>
            {!isVip && <span className="text-xs text-muted-foreground">FREE: עד 2 אודיו ({audioCount}/2)</span>}
          </div>

          <div className="space-y-2">
            {media.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                {m.type === "audio" ? <Music className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                <span className="flex-1 truncate text-sm">{m.title || m.url}</span>
                <Button size="sm" variant="ghost" onClick={() => removeMedia(m.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <AddMediaInline onAdd={addMedia} audioLimitReached={audioLimitReached} />
        </CardContent>
      </Card>
    </div>
  );
}

function AddMediaInline({ onAdd, audioLimitReached }: { onAdd: (type: "audio" | "video", url: string, title: string) => void; audioLimitReached: boolean }) {
  const [type, setType] = useState<"audio" | "video">("audio");
  const [url, setUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");

  const submit = () => {
    const finalUrl = type === "audio" ? url : videoUrl;
    if (!finalUrl) { toast.error("בחר קובץ או הדבק URL"); return; }
    onAdd(type, finalUrl, title);
    setUrl(null); setVideoUrl(""); setTitle("");
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
      <div className="flex gap-2">
        <button onClick={() => setType("audio")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs ${type === "audio" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          🎵 אודיו
        </button>
        <button onClick={() => setType("video")} className={`flex-1 rounded-md border px-3 py-1.5 text-xs ${type === "video" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          🎬 וידאו
        </button>
      </div>
      <Input placeholder="כותרת" value={title} onChange={(e) => setTitle(e.target.value)} />
      {type === "audio" ? (
        <MediaUploader folder="audio" accept="audio/*" value={url} onChange={setUrl} label="העלה אודיו" />
      ) : (
        <Input dir="ltr" placeholder="YouTube URL או קישור וידאו" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
      )}
      <Button onClick={submit} disabled={type === "audio" && audioLimitReached} className="w-full" size="sm">
        <Plus className="ml-1 h-4 w-4" /> הוסף
      </Button>
    </div>
  );
}
