import { useEffect, useState } from "react";
import { z } from "zod";
import { Send, Loader2, Megaphone, Users, Music2, ShieldCheck, History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { toast } from "sonner";

type TargetGroup = "ALL" | "PROS" | "ADMINS";

const TARGET_LABELS: Record<TargetGroup, string> = {
  ALL: "כל המשתמשים",
  PROS: "מוזיקאים מקצועיים",
  ADMINS: "מנהלים",
};

const broadcastSchema = z.object({
  title: z.string().trim().min(1, "כותרת חובה").max(120, "מקסימום 120 תווים"),
  message: z.string().trim().min(1, "תוכן ההודעה חובה").max(1000, "מקסימום 1000 תווים"),
  link: z.string().trim().max(500).optional().or(z.literal("")),
  target_group: z.enum(["ALL", "PROS", "ADMINS"]),
});

type HistoryRow = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  target_group: string;
  recipient_count: number;
  sent_at: string;
};

export function BroadcastManager() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<TargetGroup>("ALL");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("broadcast_history")
      .select("id, title, message, link, target_group, recipient_count, sent_at")
      .order("sent_at", { ascending: false })
      .limit(50);
    if (error) toast.error(friendlyError(error));
    setHistory((data ?? []) as HistoryRow[]);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const openConfirm = () => {
    const parsed = broadcastSchema.safeParse({ title, message, link, target_group: target });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "שגיאת ולידציה");
      return;
    }
    setConfirmOpen(true);
  };

  const send = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("admin_broadcast_notification", {
        p_title: title.trim(),
        p_message: message.trim(),
        p_link: link.trim() || "",
        p_target_group: target,
      });
      if (error) throw error;
      const count = Array.isArray(data) ? (data[0] as { recipient_count: number })?.recipient_count ?? 0 : 0;
      toast.success(`ההתראה נשלחה ל-${count.toLocaleString("he-IL")} משתמשים 🎉`);
      setTitle(""); setMessage(""); setLink("");
      loadHistory();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-400 ring-1 ring-amber-400/30">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">מנוע דיוור והתראות</h1>
          <p className="text-sm text-muted-foreground">שלח התראות שיווקיות לקהל יעד נבחר</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5" dir="rtl">
        <div className="space-y-2">
          <Label htmlFor="bc-title">כותרת ההתראה</Label>
          <Input
            id="bc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: מבצע בזק על קצבים לקורג!"
            maxLength={120}
            disabled={sending}
          />
          <div className="text-xs text-muted-foreground text-end">{title.length}/120</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bc-message">תוכן ההודעה</Label>
          <Textarea
            id="bc-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב כאן את גוף ההודעה שיופיע בפעמון…"
            rows={4}
            maxLength={1000}
            disabled={sending}
          />
          <div className="text-xs text-muted-foreground text-end">{message.length}/1000</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bc-link">קישור (אופציונלי)</Label>
            <Input
              id="bc-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/shop או /marketplace"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label>קהל יעד</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as TargetGroup)} disabled={sending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL"><div className="flex items-center gap-2"><Users className="h-4 w-4" />כל המשתמשים</div></SelectItem>
                <SelectItem value="PROS"><div className="flex items-center gap-2"><Music2 className="h-4 w-4" />מוזיקאים מקצועיים</div></SelectItem>
                <SelectItem value="ADMINS"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />מנהלים</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="text-xs text-muted-foreground">
            ההתראה תוצג בפעמון של כל הנמענים מיד עם השליחה.
          </div>
          <Button onClick={openConfirm} disabled={sending || !title.trim() || !message.trim()} size="lg" className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            שלח דיוור
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border/60">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">היסטוריית דיוורים</h2>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">עוד לא נשלחו דיוורים</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>כותרת</TableHead>
                <TableHead>קהל יעד</TableHead>
                <TableHead>נמענים</TableHead>
                <TableHead>קישור</TableHead>
                <TableHead>נשלח</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium truncate">{h.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.message}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TARGET_LABELS[h.target_group as TargetGroup] ?? h.target_group}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{h.recipient_count.toLocaleString("he-IL")}</TableCell>
                  <TableCell>
                    {h.link ? (
                      <a href={h.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                        {h.link} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.sent_at).toLocaleString("he-IL")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>לאשר שליחת דיוור?</AlertDialogTitle>
            <AlertDialogDescription>
              ההתראה תישלח מיד אל <strong>{TARGET_LABELS[target]}</strong>. הפעולה אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={send}>שלח עכשיו</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
