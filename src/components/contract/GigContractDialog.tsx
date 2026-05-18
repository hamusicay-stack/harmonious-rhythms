import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Send, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientName?: string;
  trigger?: React.ReactNode;
  /** Optional: who the contract is from */
  proName?: string;
  /** Optional: pro chat thread id — when present, a "contract generated" message is inserted */
  threadId?: string | null;
  /** Optional: sender of the chat message (defaults to current user) */
  senderId?: string;
}

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("he-IL"); } catch { return iso; }
};

function buildContractHtml(data: {
  clientName: string;
  proName: string;
  eventDate: string;
  eventLocation: string;
  price: string;
  notes: string;
}) {
  const today = new Date().toLocaleDateString("he-IL");
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8" />
<title>חוזה עבודה — ${data.clientName}</title>
<style>
  @page { size: A4; margin: 22mm; }
  body { font-family: -apple-system, "Segoe UI", "Heebo", Arial, sans-serif; color: #111; line-height: 1.7; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; margin: 22px 0; }
  .row { border-bottom: 1px dashed #ddd; padding: 6px 0; }
  .row .k { font-size: 11px; color: #888; }
  .row .v { font-size: 15px; font-weight: 600; }
  .notes { white-space: pre-wrap; border: 1px solid #eee; border-radius: 8px; padding: 12px; background: #fafafa; }
  .sig { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig .line { border-top: 1px solid #333; padding-top: 6px; font-size: 12px; color: #555; text-align: center; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #111; color: #fff; font-size: 11px; }
</style></head><body>
<header>
  <span class="badge">חוזה עבודה</span>
  <h1>הסכם להזמנת שירותי מוזיקה</h1>
  <div class="muted">נחתם בתאריך ${today} ${data.proName ? `· מטעם ${data.proName}` : ""}</div>
</header>
<div class="grid">
  <div class="row"><div class="k">שם הלקוח</div><div class="v">${data.clientName || "—"}</div></div>
  <div class="row"><div class="k">תאריך האירוע</div><div class="v">${fmtDate(data.eventDate)}</div></div>
  <div class="row"><div class="k">מיקום</div><div class="v">${data.eventLocation || "—"}</div></div>
  <div class="row"><div class="k">מחיר מוסכם</div><div class="v">₪ ${Number(data.price || 0).toLocaleString("he-IL")}</div></div>
</div>
<h3>תנאים והערות</h3>
<div class="notes">${data.notes ? data.notes.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string)) : "אין הערות נוספות."}</div>
<div class="sig">
  <div class="line">חתימת המזמין</div>
  <div class="line">חתימת נותן השירות</div>
</div>
<script>window.onload = () => setTimeout(() => window.print(), 250);</script>
</body></html>`;
}

export function GigContractDialog({ clientName = "", trigger, proName = "", threadId = null, senderId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName,
    eventDate: "",
    eventLocation: "",
    price: "",
    notes: "",
  });
  const [sending, setSending] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.clientName.trim() || !form.eventDate || !form.price) {
      toast.error("יש למלא שם לקוח, תאריך ומחיר");
      return;
    }
    setSending(true);
    try {
      const html = buildContractHtml({ ...form, proName });

      // Render HTML → canvas → real PDF (Hebrew preserved as raster).
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#fff;";
      const { sanitizeHtml } = await import("@/lib/sanitize");
      container.innerHTML = sanitizeHtml(html);
      document.body.appendChild(container);
      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);
        const target = container.querySelector("body") || container;
        const canvas = await html2canvas(target as HTMLElement, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;
        if (imgH <= pageH) {
          pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
        } else {
          // multi-page
          let y = 0;
          while (y < imgH) {
            pdf.addImage(imgData, "JPEG", 0, -y, imgW, imgH);
            y += pageH;
            if (y < imgH) pdf.addPage();
          }
        }
        const filename = `contract-${(form.clientName || "client").replace(/\s+/g, "-")}.pdf`;
        pdf.save(filename);
      } finally {
        container.remove();
      }

      // Insert a "contract generated" message into the chat thread (notifies client via existing trigger)
      if (threadId) {
        const senderUid = senderId ?? (await supabase.auth.getUser()).data.user?.id;
        if (senderUid) {
          const body =
            `📄 חוזה עבודה הופק ונשלח\n` +
            `לקוח: ${form.clientName}\n` +
            `תאריך אירוע: ${fmtDate(form.eventDate)}\n` +
            `מחיר מוסכם: ₪${Number(form.price).toLocaleString("he-IL")}` +
            (form.eventLocation ? `\nמיקום: ${form.eventLocation}` : "") +
            (form.notes ? `\nהערות: ${form.notes.slice(0, 280)}` : "");
          const { error } = await supabase.from("pro_chat_messages").insert({
            thread_id: threadId,
            sender_id: senderUid,
            body,
          });
          if (error) console.warn("contract message insert failed", error);
        }
      }

      toast.success("החוזה נשלח בהצלחה!");
      setOpen(false);
    } catch (e: any) {
      console.error("contract generation failed", e);
      toast.error(`יצירת החוזה נכשלה: ${e?.message ?? "שגיאה"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileSignature className="h-4 w-4" /> הפק חוזה עבודה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" /> חוזה עבודה חכם
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">שם הלקוח</Label>
            <Input value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="לקוח / מזמין האירוע" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">תאריך האירוע</Label>
              <Input type="date" dir="ltr" value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">מחיר (₪)</Label>
              <Input type="number" inputMode="numeric" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <Label className="text-xs">מיקום (אופציונלי)</Label>
            <Input value={form.eventLocation} onChange={(e) => update("eventLocation", e.target.value)} placeholder="אולם / כתובת" />
          </div>

          <div>
            <Label className="text-xs">הערות וסעיפים מיוחדים</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="זמני הופעה, ציוד, תנאי ביטול..."
              rows={4}
              maxLength={2000}
            />
          </div>

          {proName && (
            <div className="rounded-lg border bg-muted/30 p-2 text-[11px] text-muted-foreground">
              חוזה מטעם: <span className="font-semibold text-foreground">{proName}</span>
            </div>
          )}

          <Button className="w-full" onClick={submit} disabled={sending}>
            {sending ? <Send className="ml-2 h-4 w-4 animate-pulse" /> : <Printer className="ml-2 h-4 w-4" />}
            {sending ? "מייצר חוזה..." : "שלח כ-PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
