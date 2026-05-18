import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import {
  Loader2, Save, Mail, Lock, ShieldCheck, KeyRound, Smartphone,
  Download, Trash2, Palette,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AddressBook } from "./AddressBook";
import { ThemeToggle } from "./ThemeToggle";


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
      toast.error(friendlyError(err, "שגיאה בשמירה"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
            <Input id="account_email" value={user?.email ?? ""} disabled />
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

      <AddressBook refreshProfile={refreshProfile} />

      <SecuritySection email={user?.email ?? null} />

      <PreferencesSection />

      <DataPrivacySection userId={user?.id ?? null} />
    </div>
  );
}

function SecuritySection({ email }: { email: string | null }) {
  const [sending, setSending] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  const sendReset = async () => {
    if (!email) {
      toast.error("חסר אימייל בחשבון");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("נשלח אימייל לאיפוס סיסמה", {
        description: `בדוק את ${email} כדי להמשיך`,
      });
    } catch (err: unknown) {
      toast.error(friendlyError(err, "שגיאה בשליחת המייל"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-2">
          <ShieldCheck className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">אבטחה</h2>
          <p className="text-sm text-muted-foreground">
            שמור על החשבון שלך מאובטח.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">סיסמה</div>
              <div className="text-xs text-muted-foreground">
                שלח לעצמך אימייל לאיפוס סיסמה
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={sendReset}
            disabled={sending}
          >
            {sending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            שלח לי קישור
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">אימות דו-שלבי (2FA)</div>
              <div className="text-xs text-muted-foreground">
                הגנה נוספת באמצעות אפליקציה ניידת
              </div>
            </div>
          </div>
          <Switch
            checked={twoFA}
            onCheckedChange={(v) => {
              setTwoFA(v);
              toast.info("2FA דורש הגדרת אפליקציה ניידת — בקרוב!");
              setTimeout(() => setTwoFA(false), 600);
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function PreferencesSection() {
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-2">
          <Palette className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">העדפות תצוגה</h2>
          <p className="text-sm text-muted-foreground">
            התאם את מראה האתר.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
        <div>
          <div className="font-medium">ערכת נושא</div>
          <div className="text-xs text-muted-foreground">בהיר / כהה / לפי המערכת</div>
        </div>
        <ThemeToggle />
      </div>
    </Card>
  );
}

function DataPrivacySection({ userId }: { userId: string | null }) {
  const exportData = async () => {
    if (!userId) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const blob = new Blob(
        [JSON.stringify({ exported_at: new Date().toISOString(), profile }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${userId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("הנתונים שלך הורדו");
    } catch (err: unknown) {
      toast.error(friendlyError(err, "שגיאה בייצוא"));
    }
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-2">
          <Download className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">נתונים ופרטיות</h2>
          <p className="text-sm text-muted-foreground">
            השליטה על המידע שלך נמצאת בידיים שלך.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
          <div>
            <div className="font-medium">ייצא את הנתונים שלי</div>
            <div className="text-xs text-muted-foreground">
              הורדה של פרטי הפרופיל שלך כקובץ JSON
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={exportData}>
            <Download className="ml-2 h-4 w-4" />
            ייצא
          </Button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <div className="font-medium text-destructive">מחיקת חשבון</div>
            <div className="text-xs text-muted-foreground">
              פעולה בלתי הפיכה — תמחק את כל הנתונים שלך
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => toast.info("מחיקת חשבון דורשת אישור ידני — פנה לתמיכה")}
          >
            <Trash2 className="ml-2 h-4 w-4" />
            בקש מחיקה
          </Button>
        </div>
      </div>
    </Card>
  );
}

