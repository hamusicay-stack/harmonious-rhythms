import { friendlyError } from "@/lib/errors";
import { requireAuth } from "@/lib/routeGuards";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MediaUploader } from "@/components/pros/MediaUploader";
import { SPECIALTIES, GENRES, REGIONS } from "@/lib/prosData";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/pros/new")({
  beforeLoad: requireAuth,
  component: NewProPage,
});

const schema = z.object({
  display_name: z.string().trim().min(2, "שם חובה").max(80),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  region: z.string().min(1, "בחר אזור"),
});

function NewProPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    display_name: "",
    headline: "",
    bio: "",
    region: "",
    cities: "",
    specialties: [] as string[],
    genres: [] as string[],
    gear_list: "",
    brand_color: "#D4A24E",
    hourly_price_min: "",
    profile_image: null as string | null,
    cover_image: null as string | null,
    whatsapp: "",
    phone: "",
    instagram: "",
    youtube: "",
    website: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("music_pros").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setExistingId(data.id);
    });
    // Prefill profile + banner from user's profile if available
    supabase.from("profiles").select("display_name, avatar_url, banner_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm((f) => ({
        ...f,
        display_name: f.display_name || data.display_name || "",
        profile_image: f.profile_image || data.avatar_url || null,
        cover_image: f.cover_image || data.banner_url || null,
      }));
    });
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>יש להתחבר כדי להירשם כמוזיקאי.</p>
        <Link to="/auth" className="mt-4 inline-block text-primary hover:underline">להתחברות →</Link>
      </div>
    );
  }
  if (existingId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>כבר קיים פרופיל מקצועי על שמך.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/pros/$proId/edit", params: { proId: existingId } })}>
          ערוך את הפרופיל
        </Button>
      </div>
    );
  }

  const toggle = (key: "specialties" | "genres", v: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v],
    }));
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (form.specialties.length === 0) { toast.error("בחר התמחות לפחות אחת"); return; }

    setSaving(true);
    const { data, error } = await supabase.from("music_pros").insert({
      user_id: user.id,
      display_name: form.display_name.trim(),
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      region: form.region,
      cities: form.cities.split(",").map((s) => s.trim()).filter(Boolean),
      specialties: form.specialties,
      genres: form.genres,
      gear_list: form.gear_list.split(",").map((s) => s.trim()).filter(Boolean),
      brand_color: form.brand_color,
      hourly_price_min: form.hourly_price_min ? Number(form.hourly_price_min) : null,
      profile_image: form.profile_image,
      cover_image: form.cover_image,
      whatsapp: form.whatsapp.trim() || null,
      phone: form.phone.trim() || null,
      instagram: form.instagram.trim() || null,
      youtube: form.youtube.trim() || null,
      website: form.website.trim() || null,
      status: "pending",
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("הפרופיל נשלח לאישור ✨");
    if (data) navigate({ to: "/pros/$proId", params: { proId: data.id } });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 text-right md:py-12">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" /> הצטרף לאינדקס
        </div>
        <h1 className="font-display text-3xl font-bold">הצג את עצמך כמוזיקאי</h1>
        <p className="mt-1 text-muted-foreground">לאחר אישור — הפרופיל יופיע באינדקס הציבורי.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>שם מלא / שם בימה *</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
            <div><Label>כותרת קצרה</Label>
              <Input placeholder="קלידן לאירועים · 15 שנות ניסיון" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
          </div>

          <div><Label>על עצמי</Label>
            <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>

          <div>
            <Label className="mb-2 block">התמחות *</Label>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map((s) => (
                <button key={s.value} type="button" onClick={() => toggle("specialties", s.value)}
                  className={`rounded-full border px-3 py-1 text-xs ${form.specialties.includes(s.value) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
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
                  className={`rounded-full border px-3 py-1 text-xs ${form.genres.includes(g.value) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>אזור *</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="">בחר...</option>
                {REGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div><Label>ערים (פסיקים)</Label>
              <Input placeholder="ירושלים, בני ברק" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} /></div>
            <div><Label>מחיר התחלתי ₪</Label>
              <Input type="number" dir="ltr" value={form.hourly_price_min} onChange={(e) => setForm({ ...form, hourly_price_min: e.target.value })} /></div>
          </div>

          <div><Label>ציוד (פסיקים)</Label>
            <Input placeholder="Yamaha Genos 2, RCF" value={form.gear_list} onChange={(e) => setForm({ ...form, gear_list: e.target.value })} /></div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>תמונת פרופיל</Label>
              <MediaUploader folder="profile" accept="image/*" value={form.profile_image} onChange={(url) => setForm({ ...form, profile_image: url })} label="העלה תמונה" />
            </div>
            <div>
              <Label>תמונת קאבר</Label>
              <MediaUploader folder="cover" accept="image/*" value={form.cover_image} onChange={(url) => setForm({ ...form, cover_image: url })} label="העלה קאבר" />
            </div>
          </div>

          <div>
            <Label>צבע מותג</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-10 w-16 cursor-pointer rounded border" />
              <Input dir="ltr" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="max-w-[140px]" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>וואטסאפ</Label><Input dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div><Label>טלפון</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Instagram</Label><Input dir="ltr" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            <div><Label>YouTube</Label><Input dir="ltr" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>אתר</Label><Input dir="ltr" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          </div>

          <Button onClick={submit} disabled={saving} size="lg" className="w-full">
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            שלח לאישור
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
