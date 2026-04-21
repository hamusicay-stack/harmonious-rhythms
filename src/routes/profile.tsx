import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "הפרופיל שלי — המוזיקאי" },
      { name: "description", content: "ערכו את הפרופיל שלכם." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    instagram: "",
    youtube: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        website: profile.website ?? "",
        instagram: profile.instagram ?? "",
        youtube: profile.youtube ?? "",
      });
    }
  }, [profile]);

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
          location: form.location || null,
          website: form.website || null,
          instagram: form.instagram || null,
          youtube: form.youtube || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("הפרופיל עודכן בהצלחה");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "שגיאה בשמירה";
      toast.error(message.includes("duplicate") ? "שם המשתמש תפוס" : message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  const initials = (form.display_name || user.email || "?")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container mx-auto px-4 py-16 md:px-8 md:py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-2 border-primary/40 shadow-gold">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {form.display_name || "הפרופיל שלי"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-2xl px-4 py-12 md:px-8">
        <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-border/60 bg-card-elevated p-6 shadow-elegant md:p-8">
          <div className="flex items-center gap-2 border-b border-border/40 pb-4">
            <UserIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">פרטים אישיים</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">שם תצוגה</Label>
              <Input id="display_name" value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">שם משתמש</Label>
              <Input id="username" value={form.username} dir="ltr"
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                placeholder="username" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">ביוגרפיה</Label>
            <Textarea id="bio" value={form.bio} rows={4}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="ספרו על עצמכם, על המוזיקה שלכם..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">מיקום</Label>
            <Input id="location" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="תל אביב, ישראל" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">אתר אישי</Label>
              <Input id="website" value={form.website} dir="ltr"
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={form.instagram} dir="ltr"
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@username" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" value={form.youtube} dir="ltr"
              onChange={(e) => setForm({ ...form, youtube: e.target.value })}
              placeholder="https://youtube.com/@..." />
          </div>

          <div className="flex justify-end gap-3 border-t border-border/40 pt-6">
            <Link to="/"><Button type="button" variant="outline">ביטול</Button></Link>
            <Button type="submit" disabled={saving}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
              שמירת שינויים
            </Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
