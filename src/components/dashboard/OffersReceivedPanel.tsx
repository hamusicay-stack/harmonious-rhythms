import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HandCoins, Loader2, Check, X, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_amount: number;
  counter_amount: number | null;
  status: "pending" | "accepted" | "rejected" | "counter_offered";
  buyer_message: string | null;
  created_at: string;
};
type Listing = { id: string; title: string; price: number };
type Buyer = { id: string; display_name: string | null; avatar_url: string | null };

const STATUS_LABEL: Record<Offer["status"], string> = {
  pending: "ממתינה",
  accepted: "התקבלה",
  rejected: "נדחתה",
  counter_offered: "הצעה נגדית",
};

export function OffersReceivedPanel({ userId }: { userId: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [buyers, setBuyers] = useState<Record<string, Buyer>>({});
  const [loading, setLoading] = useState(true);
  const [counterInput, setCounterInput] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_offers")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Offer[];
    setOffers(list);

    if (list.length > 0) {
      const lids = Array.from(new Set(list.map((o) => o.listing_id)));
      const bids = Array.from(new Set(list.map((o) => o.buyer_id)));
      const [{ data: ls }, { data: bs }] = await Promise.all([
        supabase.from("marketplace_listings").select("id, title, price").in("id", lids),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", bids),
      ]);
      const lm: Record<string, Listing> = {};
      (ls ?? []).forEach((l: any) => { lm[l.id] = l; });
      const bm: Record<string, Buyer> = {};
      (bs ?? []).forEach((b: any) => { bm[b.id] = b; });
      setListings(lm);
      setBuyers(bm);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const sendSystemMsg = async (listingId: string, buyerId: string, body: string) => {
    let { data: thread } = await supabase
      .from("marketplace_chat_threads")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .maybeSingle();
    if (!thread) {
      const { data: created } = await supabase
        .from("marketplace_chat_threads")
        .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: userId })
        .select("id")
        .single();
      thread = created;
    }
    if (thread) {
      await supabase.from("marketplace_chat_messages").insert({
        thread_id: thread.id,
        sender_id: userId,
        body,
      });
    }
  };

  const accept = async (o: Offer) => {
    setBusyId(o.id);
    const { error } = await supabase.from("marketplace_offers").update({ status: "accepted" }).eq("id", o.id);
    if (error) { toast.error(error.message); setBusyId(null); return; }
    await sendSystemMsg(o.listing_id, o.buyer_id, `✅ הצעתך על סך ₪${o.offer_amount.toLocaleString()} התקבלה. צרו קשר לקביעת מסירה.`);
    toast.success("ההצעה התקבלה");
    setBusyId(null);
    load();
  };

  const reject = async (o: Offer) => {
    setBusyId(o.id);
    const { error } = await supabase.from("marketplace_offers").update({ status: "rejected" }).eq("id", o.id);
    if (error) { toast.error(error.message); setBusyId(null); return; }
    await sendSystemMsg(o.listing_id, o.buyer_id, `❌ ההצעה על סך ₪${o.offer_amount.toLocaleString()} נדחתה.`);
    toast.success("ההצעה נדחתה");
    setBusyId(null);
    load();
  };

  const counter = async (o: Offer) => {
    const raw = counterInput[o.id];
    const num = Number(raw);
    if (!raw || !Number.isFinite(num) || num <= 0) { toast.error("יש להזין סכום נגדי תקין"); return; }
    setBusyId(o.id);
    const { error } = await supabase
      .from("marketplace_offers")
      .update({ status: "counter_offered", counter_amount: num })
      .eq("id", o.id);
    if (error) { toast.error(error.message); setBusyId(null); return; }
    await sendSystemMsg(o.listing_id, o.buyer_id, `🔁 הצעה נגדית מהמוכר: ₪${num.toLocaleString()} (במקום ₪${o.offer_amount.toLocaleString()})`);
    toast.success("ההצעה הנגדית נשלחה");
    setBusyId(null);
    setCounterInput((s) => ({ ...s, [o.id]: "" }));
    load();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-amber-500" />
          הצעות שהתקבלו ({offers.filter((o) => o.status === "pending").length} ממתינות)
        </h3>
      </div>
      {offers.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">עדיין לא קיבלת הצעות.</div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const l = listings[o.listing_id];
            const b = buyers[o.buyer_id];
            const isPending = o.status === "pending";
            return (
              <div key={o.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{l?.title ?? "מודעה"}</div>
                    <div className="text-xs text-muted-foreground">
                      מאת {b?.display_name ?? "משתמש"} · {new Date(o.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                  <Badge
                    variant={isPending ? "secondary" : o.status === "accepted" ? "default" : o.status === "rejected" ? "destructive" : "outline"}
                  >
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  <span>מחיר מבוקש: <span className="font-semibold">₪{Number(l?.price ?? 0).toLocaleString()}</span></span>
                  <span className="text-amber-600 dark:text-amber-400">הצעה: <span className="font-bold text-lg">₪{o.offer_amount.toLocaleString()}</span></span>
                  {o.counter_amount && <span>נגדית: <span className="font-semibold">₪{o.counter_amount.toLocaleString()}</span></span>}
                </div>
                {o.buyer_message && (
                  <div className="text-sm bg-muted/40 rounded-md p-2 whitespace-pre-wrap">{o.buyer_message}</div>
                )}
                {isPending && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    <Button size="sm" onClick={() => accept(o)} disabled={busyId === o.id} className="bg-emerald-600 hover:bg-emerald-700">
                      <Check className="h-3 w-3" />קבל
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(o)} disabled={busyId === o.id}>
                      <X className="h-3 w-3" />דחה
                    </Button>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        placeholder="הצעה נגדית"
                        className="h-8 w-32"
                        value={counterInput[o.id] ?? ""}
                        onChange={(e) => setCounterInput((s) => ({ ...s, [o.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="secondary" onClick={() => counter(o)} disabled={busyId === o.id}>
                        <RefreshCcw className="h-3 w-3" />שלח נגדית
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
