import { useEffect, useState } from "react";
import { Loader2, Save, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";

export function AccountSettingsTab({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    has_whatsapp: false,
    location: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        phone: (profile as { phone?: string | null }).phone ?? "",
        has_whatsapp: !!(profile as { has_whatsapp?: boolean | null }).has_whatsapp,
        location: profile.location ?? "",
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
          phone: form.phone || null,
          has_whatsapp: !!form.phone && form.has_whatsapp,
          location: form.location || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("ההגדרות נשמרו");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="space-y-4 p-6 md:p-8">
        <div>
          <h2 className="text-lg font-bold">פרטי חשבון פרטיים</h2>
          <p className="text-sm text-muted-foreground">
            המידע הזה לא מוצג בפרופיל הציבורי שלך.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="account_email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            כתובת אימייל
          </Label>
          <div className="flex items-center gap-2">
            <Input id="account_email" value={user?.email ?? ""} disabled dir="ltr" />
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            לשינוי האימייל, פנה לתמיכה.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_phone">טלפון</Label>
              <Input
                id="account_phone"
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="050-1234567"
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-muted-foreground">
              <Checkbox
                checked={form.has_whatsapp}
                onCheckedChange={(v) => setForm({ ...form, has_whatsapp: v === true })}
                disabled={!form.phone.trim()}
                className="mt-0.5"
              />
              <span>יש לי וואטסאפ פעיל במספר זה</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_location">מיקום</Label>
            <Input
              id="account_location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="תל אביב, ישראל"
            />
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
              שמור הגדרות
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold">העדפות התראות</h2>
          <p className="text-sm text-muted-foreground">
            בחר אילו התראות תרצה לקבל.
          </p>
        </div>
        <NotificationSettings />
      </Card>
    </div>
  );
}
