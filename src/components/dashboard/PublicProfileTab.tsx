import { useEffect, useState } from "react";
import { Loader2, Save, Instagram, Youtube, Globe, Sparkles, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SPECIALTIES } from "@/lib/prosData";
import { ProfileCompletion } from "./ProfileCompletion";
import { RankXpBar } from "@/components/gamification/RankBadge";

const STATUS_OPTIONS = [
  { value: "looking_for_band", label: "מחפש/ת הרכב" },
  { value: "available_for_gigs", label: "פנוי/ה להופעות" },
  { value: "selling_gear", label: "מוכר/ת ציוד" },
  { value: "just_browsing", label: "סתם מסתובב/ת" },
] as const;
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label]),
);


export function PublicProfileTab({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState(0);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    bio: "",
    instagram: "",
    youtube: "",
    website: "",
    specialties: [] as string[],
  });

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (alive) setPoints((data as { total_points?: number } | null)?.total_points ?? 0);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        instagram: profile.instagram ?? "",
        youtube: profile.youtube ?? "",
        website: profile.website ?? "",
        specialties: (profile.specialties as string[] | null) ?? [],
      });
    }
  }, [profile]);

  const toggleSpecialty = (val: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(val)
        ? f.specialties.filter((x) => x !== val)
        : [...f.specialties, val],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name || null,
          username: form.username || null,
          bio: form.bio || null,
          instagram: form.instagram || null,
          youtube: form.youtube || null,
          website: form.website || null,
          specialties: form.specialties.length ? form.specialties : null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("הפרופיל הציבורי עודכן");
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "שגיאה בשמירה";
      toast.error(m.includes("duplicate") ? "שם המשתמש תפוס" : m);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    if (!user) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("profile-banners")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("profile-banners").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update(kind === "avatar" ? { avatar_url: pub.publicUrl } : { banner_url: pub.publicUrl })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success(kind === "avatar" ? "תמונת הפרופיל עודכנה" : "הבאנר עודכן");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <ProfileCompletion profile={profile as never} />
      <RankXpBar points={points} />

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-3xl border border-border/60 bg-card-elevated p-6 shadow-elegant md:p-8"
      >
        <div>
          <h2 className="text-lg font-bold">פרופיל ציבורי</h2>
          <p className="text-sm text-muted-foreground">
            המידע הזה גלוי לכל מבקר בעמוד הפרופיל הציבורי שלך.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>תמונת פרופיל</Label>
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border border-border">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                העלה תמונה
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, "avatar");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>תמונת קאבר (באנר)</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-28 overflow-hidden rounded-md border border-border bg-muted">
                {profile?.banner_url && (
                  <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                העלה באנר
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, "banner");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">שם תצוגה</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">שם משתמש</Label>
            <Input
              id="username"
              value={form.username}
              dir="ltr"
              onChange={(e) =>
                setForm({
                  ...form,
                  username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                })
              }
              placeholder="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">ביוגרפיה</Label>
          <Textarea
            id="bio"
            value={form.bio}
            rows={4}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="ספרו על עצמכם, על המוזיקה שלכם..."
          />
        </div>

        <div className="space-y-2">
          <Label>תחומי התמחות</Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => {
              const active = form.specialties.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSpecialty(s.value)}
                  className={
                    active
                      ? "rounded-full border-2 border-amber-500 bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-700 transition dark:text-amber-300"
                      : "rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground transition hover:border-amber-500/50 hover:text-foreground"
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {form.specialties.length > 0 && (
            <Badge variant="secondary" className="mt-1">
              {form.specialties.length} נבחרו
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">קישורים חברתיים</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </Label>
              <Input
                id="instagram"
                value={form.instagram}
                dir="ltr"
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube" className="flex items-center gap-1.5">
                <Youtube className="h-3.5 w-3.5" />
                YouTube
              </Label>
              <Input
                id="youtube"
                value={form.youtube}
                dir="ltr"
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                placeholder="https://youtube.com/@..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                אתר אישי
              </Label>
              <Input
                id="website"
                value={form.website}
                dir="ltr"
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border/40 pt-6">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
          >
            {saving ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="ml-2 h-4 w-4" />
            )}
            שמירת שינויים
          </Button>
        </div>
      </form>
    </div>
  );
}
