import { friendlyError } from "@/lib/errors";
import { useEffect, useState, useCallback } from "react";
import { Wallet, Loader2, CheckCircle2, Clock, XCircle, Banknote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PaymentMethod = "bank_transfer" | "paypal" | "bit" | "other";
type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

type Payout = {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_details: Record<string, string>;
  status: PayoutStatus;
  admin_notes: string | null;
  requested_at: string;
  paid_at: string | null;
};

const STATUS_META: Record<PayoutStatus, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: "ממתין לאישור", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  approved: { label: "אושר — בטיפול", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCircle2 },
  paid: { label: "שולם", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: Banknote },
  rejected: { label: "נדחה", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: XCircle },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "העברה בנקאית",
  paypal: "PayPal",
  bit: "ביט",
  other: "אחר",
};

const MIN_PAYOUT = 100;

export function AffiliateWallet({
  affiliateId, totalEarned, totalPaid,
}: {
  affiliateId: string;
  totalEarned: number;
  totalPaid: number;
}) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const balance = Math.max(0, totalEarned - totalPaid);
  const pendingTotal = payouts
    .filter((p) => p.status === "pending" || p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const available = Math.max(0, balance - pendingTotal);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliate_payout_requests")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("requested_at", { ascending: false });
    if (error) {
      console.error("Failed to load payouts", error);
      toast.error(friendlyError(error));
    } else {
      setPayouts((data ?? []) as Payout[]);
    }
    setLoading(false);
  }, [affiliateId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 via-background to-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <h4 className="font-display font-bold">הארנק שלי</h4>
          </div>
          <PayoutRequestDialog
            open={open}
            onOpenChange={setOpen}
            affiliateId={affiliateId}
            available={available}
            onCreated={load}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-card p-2.5">
            <div className="text-[11px] text-muted-foreground">זמין למשיכה</div>
            <div className="text-xl font-bold text-emerald-600">₪{available.toLocaleString("he-IL")}</div>
          </div>
          <div className="rounded-lg bg-card p-2.5">
            <div className="text-[11px] text-muted-foreground">בתהליך משיכה</div>
            <div className="text-xl font-bold">₪{pendingTotal.toLocaleString("he-IL")}</div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          ניתן לבקש משיכה מסכום של ₪{MIN_PAYOUT}. עיבוד עד 7 ימי עסקים.
        </p>
      </div>

      {/* History */}
      <div className="space-y-2">
        <h5 className="text-sm font-semibold">היסטוריית משיכות</h5>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : payouts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center border rounded-lg">
            אין עדיין בקשות משיכה
          </p>
        ) : (
          <div className="space-y-1.5">
            {payouts.map((p) => {
              const meta = STATUS_META[p.status];
              const Icon = meta.icon;
              return (
                <div key={p.id} className="rounded-lg border bg-card p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">₪{Number(p.amount).toLocaleString("he-IL")}</span>
                      <span className="text-muted-foreground">{METHOD_LABEL[p.payment_method]}</span>
                    </div>
                    <Badge variant="outline" className={cn("gap-1", meta.cls)}>
                      <Icon className="h-3 w-3" />{meta.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>נשלחה: {new Date(p.requested_at).toLocaleDateString("he-IL")}</span>
                    {p.paid_at && <span>שולם: {new Date(p.paid_at).toLocaleDateString("he-IL")}</span>}
                  </div>
                  {p.admin_notes && (
                    <p className="rounded bg-muted/50 p-1.5 text-[11px]">{p.admin_notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutRequestDialog({
  open, onOpenChange, affiliateId, available, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  affiliateId: string;
  available: number;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt < MIN_PAYOUT) {
      toast.error(`סכום מינימלי: ₪${MIN_PAYOUT}`);
      return;
    }
    if (amt > available) {
      toast.error(`הסכום עולה על היתרה הזמינה (₪${available})`);
      return;
    }
    if (!details.trim()) {
      toast.error("יש לציין פרטי תשלום");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("affiliate_payout_requests").insert({
        affiliate_id: affiliateId,
        amount: amt,
        payment_method: method,
        payment_details: { details: details.trim() },
      });
      if (error) throw error;
      toast.success("בקשת המשיכה נשלחה!");
      setAmount(""); setDetails("");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "השליחה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  const canRequest = available >= MIN_PAYOUT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={!canRequest}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md disabled:opacity-50"
        >
          <Plus className="ml-1 h-3.5 w-3.5" />
          בקש משיכה
        </Button>
      </DialogTrigger>
      <DialogContent className="text-right">
        <DialogHeader>
          <DialogTitle>בקשת משיכת רווחים</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-emerald-500/10 p-3 text-sm">
            יתרה זמינה: <strong>₪{available.toLocaleString("he-IL")}</strong>
          </div>
          <div className="space-y-1.5">
            <Label>סכום למשיכה (₪)</Label>
            <Input
              type="number"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_PAYOUT}
              max={available}
              placeholder={`מינימום ${MIN_PAYOUT}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label>אמצעי תשלום</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bit">ביט</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>פרטי תשלום</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder={
                method === "bank_transfer"
                  ? "בנק, סניף, מס׳ חשבון, שם בעל החשבון"
                  : method === "paypal"
                  ? "כתובת PayPal"
                  : method === "bit"
                  ? "מספר טלפון לביט"
                  : "פרטים נוספים"
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            שלח בקשה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
