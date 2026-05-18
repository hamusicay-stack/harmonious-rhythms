import { useEffect, useState } from "react";
import { Loader2, PartyPopper, UserCircle2, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Candidate = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  source: "chat" | "offer";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  onDone?: () => void;
};

const ANON = "__anon__";

export function MarkAsSoldDialog({ open, onOpenChange, listingId, listingTitle, sellerId, onDone }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Buyers from chat threads + accepted offers
      const [threadsRes, offersRes] = await Promise.all([
        supabase
          .from("marketplace_chat_threads")
          .select("buyer_id")
          .eq("listing_id", listingId),
        supabase
          .from("marketplace_offers")
          .select("buyer_id, status")
          .eq("listing_id", listingId)
          .in("status", ["accepted", "pending"]),
      ]);
      const idMap = new Map<string, "chat" | "offer">();
      (threadsRes.data ?? []).forEach((t: any) => { if (t.buyer_id) idMap.set(t.buyer_id, "chat"); });
      (offersRes.data ?? []).forEach((o: any) => { if (o.buyer_id && !idMap.has(o.buyer_id)) idMap.set(o.buyer_id, "offer"); });

      const ids = [...idMap.keys()];
      let profs: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        profs = data ?? [];
      }
      const list: Candidate[] = ids.map((id) => {
        const p = profs.find((x) => x.id === id);
        return {
          user_id: id,
          display_name: p?.display_name ?? "משתמש",
          avatar_url: p?.avatar_url ?? null,
          source: idMap.get(id) ?? "chat",
        };
      });
      if (!cancelled) {
        setCandidates(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, listingId]);

  const confirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (selected === ANON) {
        // Anonymous / off-site sale — flip listing directly, no confirmation row
        const { error } = await supabase
          .from("marketplace_listings")
          .update({ is_sold: true, sold_at: new Date().toISOString() })
          .eq("id", listingId);
        if (error) throw error;
        toast.success("המודעה סומנה כנמכרה");
      } else {
        const { error } = await supabase
          .from("marketplace_deal_confirmations")
          .insert({
            listing_id: listingId,
            seller_id: sellerId,
            buyer_id: selected,
            status: "pending_buyer_confirmation",
          });
        if (error) throw error;
        toast.success("בקשת אישור נשלחה לקונה", { description: "המודעה תעבור לסטטוס 'נמכר' לאחר שהקונה יאשר." });
      }
      onOpenChange(false);
      setSelected("");
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בעדכון");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PartyPopper className="h-5 w-5 text-primary" />
            מזל טוב על המכירה! 🎉
          </DialogTitle>
          <DialogDescription className="text-right">
            בחר את הקונה כדי לאמת את העסקה ולאפשר לו לכתוב ביקורת רוכש מאומת על: <span className="font-semibold text-foreground">{listingTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">לא נמצאו פניות פעילות לפריט זה.</p>
            ) : (
              candidates.map((c) => {
                const isPicked = selected === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    type="button"
                    onClick={() => setSelected(c.user_id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition ${
                      isPicked ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{c.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.source === "chat" ? "התכתב על הפריט" : "הציע הצעה"}
                      </div>
                    </div>
                    {isPicked && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })
            )}

            <button
              type="button"
              onClick={() => setSelected(ANON)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-right transition ${
                selected === ANON ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-right">
                <div className="font-semibold">מכרתי מחוץ לאתר / לקונה אנונימי</div>
                <div className="text-xs text-muted-foreground">לא ייפתח אימות רוכש</div>
              </div>
              {selected === ANON && <Check className="h-5 w-5 text-primary" />}
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>ביטול</Button>
          <Button
            onClick={confirm}
            disabled={!selected || submitting}
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
          >
            {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {selected === ANON ? "סמן כנמכר" : "שלח בקשת אישור לקונה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
