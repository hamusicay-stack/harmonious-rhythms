import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bot, Copy, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";

/**
 * Frontend skeleton for the WhatsApp Ingest Node — the configuration card
 * inside the admin upload console. Persists nothing yet; lays out the
 * webhook receiver + live status panel so the backend pipeline can wire
 * into a stable UI later.
 */
export function WhatsAppIngestConfig() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("wh_sk_••••••••••••••••");
  const [status] = useState<"waiting" | "connected" | "error">("waiting");

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/whatsapp-ingest`
      : "/api/public/whatsapp-ingest";

  const copy = (s: string) => {
    void navigator.clipboard.writeText(s);
    toast.success("הועתק");
  };

  const rotate = () => {
    const next =
      "wh_sk_" +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2);
    setSecret(next);
    toast.success("מפתח חדש נוצר — אל תשכח לעדכן בבוט");
  };

  return (
    <Card
      className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-amber-400" />
          חיבור למנוע העלאות אוטומטי (WhatsApp Ingest Node)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
          <div>
            <div className="text-sm font-medium">הפעלת קליטה אוטומטית</div>
            <div className="text-xs text-muted-foreground">
              קבלת קבצי וידאו מצ'אטים ניידים ישירות לתור האישור.
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Webhook URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="text-xs font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Webhook Secret</Label>
          <div className="flex gap-2">
            <Input value={secret} readOnly className="text-xs font-mono" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(secret)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={rotate}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 p-3 bg-zinc-950/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-amber-400" />
              סטטוס פייפליין
            </div>
            <Badge
              variant="outline"
              className={
                status === "connected"
                  ? "border-emerald-500/50 text-emerald-400"
                  : status === "error"
                    ? "border-red-500/50 text-red-400"
                    : "border-amber-500/50 text-amber-400"
              }
            >
              {status === "connected"
                ? "מחובר"
                : status === "error"
                  ? "שגיאה"
                  : "ממתין"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            ממתין לקובץ מדיה משרת הבוט…
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          הצבעת הבוט אל ה-Webhook לעיל. כל הודעה עם וידאו תיכנס לתור האישור,
          תיצרף שם וטקסט אם נשלחו, ותחכה לאישור מנהל לפני פרסום.
        </p>
      </CardContent>
    </Card>
  );
}
