import { friendlyError } from "@/lib/errors";
import { requireAuth } from "@/lib/routeGuards";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trash2, Plus, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isUserVip } from "@/lib/tiers";
import { wrapVipCheck } from "@/lib/entitlements";
import { MediaUploader } from "@/components/pros/MediaUploader";
import { type EditablePackage } from "@/components/pros/PackagesEditor";
import { ProProfileWizard, type ProFormState } from "@/components/pros/ProProfileWizard";
import { toast } from "sonner";

export const Route = createFileRoute("/pros/$proId/edit")({
  beforeLoad: requireAuth,
  component: EditProPage,
});

type Media = { id: string; type: string; url: string; title: string | null };

function EditProPage() {
  const { proId } = Route.useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
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
      // Defensive: ensure array fields are never null
      if (p) {
        p.specialties = p.specialties ?? [];
        p.genres = p.genres ?? [];
        p.cities = p.cities ?? [];
        p.gear_list = p.gear_list ?? [];
        // Unified tier: derive VIP from owner's global tier
        const vip = await isUserVip(p.user_id);
        p.subscription_tier = vip ? "vip" : "free";
      }
      setPro(p);
      setPackages((pk as EditablePackage[]) ?? []);
      setMedia((m as Media[]) ?? []);
      setLoading(false);
    })();
  }, [proId]);

  if (loading || authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!pro) return <div className="container mx-auto px-4 py-16 text-center">לא נמצא</div>;
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <p>יש להתחבר כדי לערוך פרופיל</p>
        <Button onClick={() => navigate({ to: "/auth" })}>התחברות</Button>
      </div>
    );
  }
  if (!isAdmin && user.id !== pro.user_id) {
    return <div className="container mx-auto px-4 py-16 text-center">אין לך הרשאה לערוך פרופיל זה</div>;
  }

  const isVip = wrapVipCheck(pro.subscription_tier === "vip", {
    userId: pro.user_id,
    module: "pros.$proId.edit",
  });
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
    try {
      const { error: updErr } = await supabase.from("music_pros").update({
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
        show_phone_public: pro.subscription_tier === "vip" ? !!pro.show_phone_public : false,
        show_whatsapp_public: pro.subscription_tier === "vip" ? !!pro.show_whatsapp_public : false,
      }).eq("id", proId);
      if (updErr) throw updErr;

      // Sync packages: delete existing, re-insert
      const { error: delErr } = await supabase.from("music_pro_packages").delete().eq("pro_id", proId);
      if (delErr) throw delErr;
      if (packages.length > 0) {
        const rows = packages.filter((p) => p.title.trim()).map((p, i) => ({
          pro_id: proId, title: p.title, description: p.description || null,
          price: p.price, unit: p.unit, display_order: i,
        }));
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("music_pro_packages").insert(rows);
          if (insErr) throw insErr;
        }
      }
      toast.success("השינויים נשמרו בהצלחה");
    } catch (e: any) {
      console.error("Failed to save pro profile", e);
      toast.error(e?.message ?? "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const addMedia = async (type: "audio" | "video", url: string, title: string) => {
    if (type === "audio" && audioLimitReached) {
      toast.error("מנוי FREE מוגבל ל-2 קבצי אודיו. שדרג ל-VIP."); return;
    }
    const { data, error } = await supabase.from("music_pro_media").insert({
      pro_id: proId, type, url, title: title || null, display_order: media.length,
    }).select("*").maybeSingle();
    if (error) { toast.error(friendlyError(error)); return; }
    if (data) setMedia([...media, data as Media]);
  };

  const removeMedia = async (id: string) => {
    const { error } = await supabase.from("music_pro_media").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    setMedia(media.filter((m) => m.id !== id));
  };

  const formState: ProFormState = {
    display_name: pro.display_name ?? "",
    headline: pro.headline ?? "",
    bio: pro.bio ?? "",
    region: pro.region ?? "",
    cities: pro.cities ?? [],
    specialties: pro.specialties ?? [],
    genres: pro.genres ?? [],
    gear_list: pro.gear_list ?? [],
    brand_color: pro.brand_color ?? "#D4A24E",
    hourly_price_min: pro.hourly_price_min ?? null,
    profile_image: pro.profile_image ?? null,
    cover_image: pro.cover_image ?? null,
    whatsapp: pro.whatsapp ?? "",
    phone: pro.phone ?? "",
    instagram: pro.instagram ?? "",
    youtube: pro.youtube ?? "",
    website: pro.website ?? "",
    show_phone_public: !!pro.show_phone_public,
    show_whatsapp_public: !!pro.show_whatsapp_public,
    subscription_tier: pro.subscription_tier ?? "free",
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 text-right">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">עריכת פרופיל</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/pros/my-inquiries" className="text-muted-foreground hover:text-primary">📥 ההזמנות שלי</Link>
          <Link to="/pros/$proId" params={{ proId }} className="text-primary hover:underline">צפה בפרופיל →</Link>
        </div>
      </div>

      <ProProfileWizard
        value={formState}
        onChange={(next) => setPro({ ...pro, ...next })}
        packages={packages}
        onPackagesChange={setPackages}
        onSave={save}
        saving={saving}
      />

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
        <Input placeholder="YouTube URL או קישור וידאו" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
      )}
      <Button onClick={submit} disabled={type === "audio" && audioLimitReached} className="w-full" size="sm">
        <Plus className="ml-1 h-4 w-4" /> הוסף
      </Button>
    </div>
  );
}
