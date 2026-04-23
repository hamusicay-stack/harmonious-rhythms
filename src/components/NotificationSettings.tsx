import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Heart, UserPlus, MessageCircle, Mail, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Prefs = {
  notify_follow: boolean;
  notify_like: boolean;
  notify_comment: boolean;
  notify_inquiry: boolean;
  notify_followed_user_activity: boolean;
};

const DEFAULTS: Prefs = {
  notify_follow: true,
  notify_like: true,
  notify_comment: true,
  notify_inquiry: true,
  notify_followed_user_activity: false,
};

export function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          notify_follow: (data as any).notify_follow,
          notify_like: (data as any).notify_like,
          notify_comment: (data as any).notify_comment,
          notify_inquiry: (data as any).notify_inquiry,
          notify_followed_user_activity: (data as any).notify_followed_user_activity,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences" as any)
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("שמירה נכשלה");
      setPrefs(prefs);
    } else {
      toast.success("נשמר");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const items: Array<{ key: keyof Prefs; icon: React.ReactNode; title: string; desc: string }> = [
    { key: "notify_follow", icon: <UserPlus className="h-4 w-4 text-blue-500" />, title: "עוקבים חדשים", desc: "כשמישהו מתחיל לעקוב אחריך" },
    { key: "notify_like", icon: <Heart className="h-4 w-4 text-rose-500" />, title: "לייקים", desc: "כשאוהבים שורט/מודעה/פרופיל שלך" },
    { key: "notify_comment", icon: <MessageCircle className="h-4 w-4 text-emerald-500" />, title: "תגובות", desc: "תגובות חדשות על השורטס שלך" },
    { key: "notify_inquiry", icon: <Mail className="h-4 w-4 text-amber-500" />, title: "פניות", desc: "בקשות הצעת מחיר על הפרופיל המקצועי" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">הגדרות התראות</h3>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <p className="mb-4 text-sm text-muted-foreground">בחר אילו התראות תרצה לקבל. ההיסטוריה תישמר תמיד; ההגדרה רק קובעת אם תקבל התראה חדשה.</p>

        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-full bg-muted p-2 mt-0.5">{it.icon}</div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{it.title}</Label>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
              </div>
              <Switch checked={prefs[it.key]} onCheckedChange={(v) => update(it.key, v)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-full bg-primary/15 p-2 mt-0.5">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-semibold">פעילות של אנשים שאני עוקב אחריהם</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                קבל התראה כשמישהו שאתה עוקב אחריו מעלה שורט חדש או מפרסם מודעה ביד 2.
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.notify_followed_user_activity}
            onCheckedChange={(v) => update("notify_followed_user_activity", v)}
          />
        </div>
      </Card>
    </div>
  );
}
