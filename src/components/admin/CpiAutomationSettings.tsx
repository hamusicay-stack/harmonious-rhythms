import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, Webhook } from "lucide-react";
import { toast } from "sonner";

export function CpiAutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("rhythm_automation_settings" as any)
        .select("*").eq("id", 1).maybeSingle();
      if (error) toast.error(friendlyError(error));
      else if (data) {
        const r = data as any;
        setUrl(r.webhook_url ?? "");
        setSecret(r.webhook_secret ?? "");
        setEnabled(r.enabled ?? true);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("rhythm_automation_settings" as any)
      .update({ webhook_url: url.trim() || null, webhook_secret: secret.trim() || null, enabled, updated_at: new Date().toISOString() } as any)
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("נשמר");
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />אוטומציה — Webhook ליצירת CPI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>איך זה עובד</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            כאשר נוצרת הזמנה בסטטוס <code>processing</code> עם קובץ <code>.n27</code>, המערכת תשלח POST ל-URL שתגדיר עם:
            <code className="block mt-1 bg-muted/50 p-2 rounded">{`{ order_id, user_email, purchased_set_id, n27_file_url }`}</code>
            ובכותרת <code>x-webhook-secret</code> אם הוגדר.
          </AlertDescription>
        </Alert>

        <div>
          <Label>Webhook URL</Label>
          <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-windows-vps.com/api/generate-cpi" />
        </div>

        <div>
          <Label>Shared Secret (אופציונלי)</Label>
          <Input dir="ltr" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="..." />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <Label className="cursor-pointer">אוטומציה פעילה</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}
        </Button>
      </CardContent>
    </Card>
  );
}
