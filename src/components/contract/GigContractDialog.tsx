import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientName?: string;
  trigger?: React.ReactNode;
  /** Optional: who the contract is from */
  proName?: string;
}

export function GigContractDialog({ clientName = "", trigger, proName = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: clientName,
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
      // Placeholder: PDF generation + send hook will be wired to backend
      await new Promise((r) => setTimeout(r, 700));
      toast.success("החוזה נוצר ונשלח כ-PDF ללקוח");
      setOpen(false);
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
            <Send className="ml-2 h-4 w-4" />
            {sending ? "מייצר חוזה..." : "שלח כ-PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
