import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Mail, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MarketplaceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState(30);
  const [enabled, setEnabled] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_settings")
      .select("followup_days, followup_enabled, auto_approve_listings")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      setDays(data.followup_days);
      setEnabled(data.followup_enabled);
      setAutoApprove((data as any).auto_approve_listings ?? false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (days < 1 || days > 365) {
      return toast.error("מספר הימים חייב להיות בין 1 ל-365");
    }
    setSaving(true);
    const { error } = await supabase
      .from("marketplace_settings")
      .update({ followup_days: days, followup_enabled: enabled, auto_approve_listings: autoApprove, updated_at: new Date().toISOString() } as any)
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(friendlyError(error, "שגיאה בשמירה"));
    toast.success("ההגדרות נשמרו");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/marketplace/followup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה");
      toast.success(`הופעל בהצלחה — נשלחו ${json.processed ?? 0} מיילים`);
    } catch (e: any) {
      toast.error("שגיאה בהפעלה: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />הגדרות מעקב מודעות</CardTitle>
        <p className="text-sm text-muted-foreground">
          המערכת שולחת אוטומטית מייל למוכר אחרי X ימים מפרסום המודעה ושואלת אם הפריט נמכר.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3 bg-primary/5">
          <div>
            <Label className="text-base">אישור אוטומטי לכל מודעה חדשה</Label>
            <p className="text-xs text-muted-foreground">כשדלוק — כל מודעה חדשה מתפרסמת מיידית בלי המתנה לאישור ידני.</p>
          </div>
          <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-base">מעקב מודעות פעיל</Label>
            <p className="text-xs text-muted-foreground">כיבוי יעצור שליחת מיילי מעקב</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <Label>מספר ימים לפני שליחת המייל</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              className="w-32"
              disabled={!enabled}
            />
            <span className="text-sm text-muted-foreground">ימים</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ברירת מחדל: 30 ימים. ניתן לשנות ל-1 עד 365 ימים.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Save className="ms-2 h-4 w-4" />}
            שמירה
          </Button>
          <Button variant="outline" onClick={runNow} disabled={running || !enabled}>
            {running ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <PlayCircle className="ms-2 h-4 w-4" />}
            הפעלה ידנית עכשיו
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
