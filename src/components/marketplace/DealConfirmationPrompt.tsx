import { useEffect, useState } from "react";
import { BadgeCheck, ShieldQuestion, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Pending = {
  id: string;
  listing_id: string;
  listing_title: string | null;
  seller_name: string | null;
};

type Props = {
  listingId?: string; // scope to single listing (for ChatThreadDialog)
  onResolved?: () => void;
};

export function DealConfirmationPrompt({ listingId, onResolved }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    let req = supabase
      .from("marketplace_deal_confirmations")
      .select("id, listing_id, seller_id, marketplace_listings(title), profiles!marketplace_deal_confirmations_seller_id_fkey(display_name)")
      .eq("buyer_id", user.id)
      .eq("status", "pending_buyer_confirmation");
    if (listingId) req = req.eq("listing_id", listingId);
    // Fallback: the FK on seller_id may not be named — fetch profile separately
    const { data: rows } = await supabase
      .from("marketplace_deal_confirmations")
      .select("id, listing_id, seller_id")
      .eq("buyer_id", user.id)
      .eq("status", "pending_buyer_confirmation")
      .match(listingId ? { listing_id: listingId } : {});
    const list = rows ?? [];
    if (list.length === 0) { setItems([]); setLoading(false); return; }
    const listingIds = list.map((r: any) => r.listing_id);
    const sellerIds = list.map((r: any) => r.seller_id);
    const [{ data: listings }, { data: sellers }] = await Promise.all([
      supabase.from("marketplace_listings").select("id, title").in("id", listingIds),
      supabase.from("profiles").select("id, display_name").in("id", sellerIds),
    ]);
    setItems(list.map((r: any) => ({
      id: r.id,
      listing_id: r.listing_id,
      listing_title: listings?.find((l: any) => l.id === r.listing_id)?.title ?? null,
      seller_name: sellers?.find((s: any) => s.id === r.seller_id)?.display_name ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, listingId]);

  const respond = async (id: string, status: "confirmed" | "rejected") => {
    setBusyId(id);
    const { error } = await supabase
      .from("marketplace_deal_confirmations")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "confirmed" ? "אישרת את הרכישה — אפשרות לכתוב ביקורת מאומתת נפתחה" : "סימנת שלא רכשת");
    setItems((arr) => arr.filter((i) => i.id !== id));
    onResolved?.();
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="relative overflow-hidden rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-[0_0_30px_-10px_hsl(var(--primary))]"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <ShieldQuestion className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-sm font-semibold leading-snug">
                המוכר {it.seller_name ? <span className="text-primary">{it.seller_name}</span> : null} סימן שרכשת ממנו את <span className="font-bold">{it.listing_title || "הפריט"}</span>. האם זה נכון?
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => respond(it.id, "confirmed")}
                  disabled={busyId === it.id}
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                >
                  {busyId === it.id ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="ml-1 h-3.5 w-3.5" />}
                  כן, רכשתי!
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond(it.id, "rejected")} disabled={busyId === it.id}>
                  <X className="ml-1 h-3.5 w-3.5" />לא, לא קניתי
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
