import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldQuestion, X, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
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
  /** "chat" shows a deep-link to the dashboard after confirm; "inline" just dismisses. */
  variant?: "chat" | "inline";
};

type Confirmed = { listingId: string; title: string | null };

export function DealConfirmationPrompt({ listingId, onResolved, variant = "inline" }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const load = async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("marketplace_deal_confirmations")
      .select("id, listing_id, seller_id")
      .eq("buyer_id", user.id)
      .eq("status", "pending_buyer_confirmation")
      .match(listingId ? { listing_id: listingId } : {});
    const list = rows ?? [];
    if (list.length === 0) { setItems([]); setLoading(false); return; }
    const listingIds = list.map((r) => r.listing_id);
    const sellerIds = list.map((r) => r.seller_id);
    const [{ data: listings }, { data: sellers }] = await Promise.all([
      supabase.from("marketplace_listings").select("id, title").in("id", listingIds),
      supabase.from("profiles").select("id, display_name").in("id", sellerIds),
    ]);
    setItems(list.map((r) => ({
      id: r.id,
      listing_id: r.listing_id,
      listing_title: (listings ?? []).find((l: { id: string }) => l.id === r.listing_id)?.title ?? null,
      seller_name: (sellers ?? []).find((s: { id: string }) => s.id === r.seller_id)?.display_name ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id, listingId]);

  const respond = async (e: React.MouseEvent, it: Pending, status: "confirmed" | "rejected") => {
    e.preventDefault(); e.stopPropagation();
    setBusyId(it.id);
    const { error } = await supabase
      .from("marketplace_deal_confirmations")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", it.id);
    setBusyId(null);
    if (error) { toast.error(friendlyError(error)); return; }
    setItems((arr) => arr.filter((i) => i.id !== it.id));
    if (status === "confirmed") {
      toast.success("העסקה אומתה ✓");
      if (variant === "chat") {
        setConfirmed({ listingId: it.listing_id, title: it.listing_title });
      }
    } else {
      toast.success("סימנת שלא רכשת");
    }
    onResolved?.();
  };

  if (loading) return null;

  return (
    <div className="space-y-2">
      {variant === "chat" && confirmed ? (
        <div
          className="relative overflow-hidden rounded-xl border-2 border-primary/60 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-4 shadow-[0_0_30px_-8px_hsl(var(--primary))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/25 p-2"><ShieldCheck className="h-5 w-5 text-primary" /></div>
            <div className="flex-1 space-y-2">
              <div className="text-sm font-semibold">העסקה אומתה! המשך לכתיבת חוות הדעת באזור האישי.</div>
              <Link
                to="/profile"
                search={{ tab: "yad2", subTab: "purchases", openReview: confirmed.listingId } as never}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))] transition hover:shadow-[0_0_32px_-4px_hsl(var(--primary))]"
              >
                העסקה אומתה! עבר לכתיבת חוות דעת באזור האישי
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {items.map((it) => (
        <div
          key={it.id}
          className="relative overflow-hidden rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-[0_0_30px_-10px_hsl(var(--primary))]"
          onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => respond(e, it, "confirmed")}
                  disabled={busyId === it.id}
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                >
                  {busyId === it.id ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="ml-1 h-3.5 w-3.5" />}
                  כן, רכשתי!
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => respond(e, it, "rejected")} disabled={busyId === it.id}>
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
