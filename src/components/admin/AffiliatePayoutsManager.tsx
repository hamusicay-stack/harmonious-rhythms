import { friendlyError } from "@/lib/errors";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Banknote, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

type Payout = {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_method: string;
  payment_details: Record<string, string>;
  status: PayoutStatus;
  admin_notes: string | null;
  requested_at: string;
  paid_at: string | null;
  affiliate?: { ref_code: string; user_id: string };
  user?: { display_name: string | null; email?: string | null };
};

const STATUS_META: Record<PayoutStatus, { label: string; cls: string }> = {
  pending: { label: "ממתין", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  approved: { label: "אושר", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  paid: { label: "שולם", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  rejected: { label: "נדחה", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "העברה בנקאית",
  paypal: "PayPal",
  bit: "ביט",
  other: "אחר",
};

export function AffiliatePayoutsManager() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliate_payout_requests")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) { toast.error(friendlyError(error)); setLoading(false); return; }

    const rows = (data ?? []) as Payout[];
    const affIds = Array.from(new Set(rows.map((r) => r.affiliate_id)));
    if (affIds.length === 0) { setPayouts(rows); setLoading(false); return; }

    const { data: affs } = await supabase
      .from("affiliates").select("id, ref_code, user_id").in("id", affIds);
    const affMap = new Map((affs ?? []).map((a) => [a.id, a]));

    const userIds = Array.from(new Set((affs ?? []).map((a) => a.user_id)));
    const { data: profs } = await supabase
      .from("profiles").select("id, display_name").in("id", userIds);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    setPayouts(rows.map((r) => {
      const aff = affMap.get(r.affiliate_id);
      const prof = aff ? profMap.get(aff.user_id) : null;
      return {
        ...r,
        affiliate: aff ? { ref_code: aff.ref_code, user_id: aff.user_id } : undefined,
        user: prof ? { display_name: prof.display_name } : undefined,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, status: PayoutStatus, adminNotes?: string) => {
    const update: any = { status };
    if (adminNotes !== undefined) update.admin_notes = adminNotes;
    const { error } = await supabase.from("affiliate_payout_requests").update(update).eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(`עודכן: ${STATUS_META[status].label}`);
    setSelected(null);
    void load();
  };

  const filterByStatus = (s: PayoutStatus | "all") =>
    s === "all" ? payouts : payouts.filter((p) => p.status === s);

  const counts = {
    pending: payouts.filter((p) => p.status === "pending").length,
    approved: payouts.filter((p) => p.status === "approved").length,
    paid: payouts.filter((p) => p.status === "paid").length,
    rejected: payouts.filter((p) => p.status === "rejected").length,
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-600" />
          <h3 className="font-display text-lg font-bold">בקשות משיכה של שותפים</h3>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="pending">
              <Clock className="ms-1 h-3.5 w-3.5" /> ממתינות
              {counts.pending > 0 && <Badge variant="default" className="me-1">{counts.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved">אושרו {counts.approved > 0 && `(${counts.approved})`}</TabsTrigger>
            <TabsTrigger value="paid">שולמו {counts.paid > 0 && `(${counts.paid})`}</TabsTrigger>
            <TabsTrigger value="rejected">נדחו</TabsTrigger>
            <TabsTrigger value="all">הכל</TabsTrigger>
          </TabsList>

          {(["pending", "approved", "paid", "rejected", "all"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-3 space-y-2">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filterByStatus(tab).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">אין בקשות</p>
              ) : (
                filterByStatus(tab).map((p) => (
                  <PayoutRow key={p.id} payout={p} onClick={() => setSelected(p)} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {selected && (
          <PayoutReviewDialog
            payout={selected}
            onClose={() => setSelected(null)}
            onAction={updateStatus}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PayoutRow({ payout, onClick }: { payout: Payout; onClick: () => void }) {
  const meta = STATUS_META[payout.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border bg-card p-3 text-end hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="font-bold">{payout.user?.display_name ?? "—"}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {payout.affiliate?.ref_code}
          </span>
        </div>
        <Badge variant="outline" className={cn(meta.cls)}>{meta.label}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{METHOD_LABEL[payout.payment_method]}</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {new Date(payout.requested_at).toLocaleDateString("he-IL")}
          </span>
          <span className="text-base font-bold text-emerald-600">
            ₪{Number(payout.amount).toLocaleString("he-IL")}
          </span>
        </div>
      </div>
    </button>
  );
}

function PayoutReviewDialog({
  payout, onClose, onAction,
}: {
  payout: Payout;
  onClose: () => void;
  onAction: (id: string, status: PayoutStatus, notes?: string) => void;
}) {
  const [notes, setNotes] = useState(payout.admin_notes ?? "");

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="text-end max-w-md">
        <DialogHeader>
          <DialogTitle>בקשת משיכה — ₪{Number(payout.amount).toLocaleString("he-IL")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="שותף" value={payout.user?.display_name ?? "—"} />
          <Row label="קוד הפניה" value={payout.affiliate?.ref_code ?? "—"} mono />
          <Row label="אמצעי תשלום" value={METHOD_LABEL[payout.payment_method]} />
          <Row label="סטטוס נוכחי" value={STATUS_META[payout.status].label} />
          <div>
            <Label className="text-xs">פרטי תשלום</Label>
            <pre className="mt-1 rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap" dir="auto">
              {JSON.stringify(payout.payment_details, null, 2)}
            </pre>
          </div>
          <div>
            <Label className="text-xs">הערות מנהל (יוצגו לשותף)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {payout.status === "pending" && (
            <>
              <Button
                variant="outline"
                className="text-rose-600 hover:bg-rose-500/10"
                onClick={() => onAction(payout.id, "rejected", notes || undefined)}
              >
                <XCircle className="ms-1 h-4 w-4" /> דחה
              </Button>
              <Button
                variant="outline"
                onClick={() => onAction(payout.id, "approved", notes || undefined)}
              >
                <CheckCircle2 className="ms-1 h-4 w-4" /> אשר (לא משולם)
              </Button>
            </>
          )}
          {payout.status !== "paid" && payout.status !== "rejected" && (
            <Button
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
              onClick={() => onAction(payout.id, "paid", notes || undefined)}
            >
              <Banknote className="ms-1 h-4 w-4" /> סמן כשולם
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
