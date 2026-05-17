import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Crown, Loader2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/**
 * BoostListingDialog
 * VIP users boost instantly (quota assumed > 0 for now).
 * Non-VIP users add the boost as a CartItem (product_type: "marketplace_boost")
 * and are redirected to /shop/checkout. Fulfillment happens in checkout submit.
 *
 * Pricing is fetched live from `service_pricing` (keys: boost_24h, boost_48h)
 * so admin price changes take effect immediately for buyers.
 */

type BoostOption = { hours: 24 | 48; priceNis: number; serviceKey: string };
const HOURS_BY_KEY: Record<string, 24 | 48> = { boost_24h: 24, boost_48h: 48 };
const FALLBACK_OPTIONS: BoostOption[] = [
  { hours: 24, priceNis: 20, serviceKey: "boost_24h" },
  { hours: 48, priceNis: 35, serviceKey: "boost_48h" },
];

async function applyBump(listingId: string, hours: number) {
  const now = new Date();
  const expires = new Date(now.getTime() + hours * 3600 * 1000).toISOString();
  const { error } = await supabase
    .from("marketplace_listings")
    .update({ bumped_at: now.toISOString(), bump_expires_at: expires })
    .eq("id", listingId);
  if (error) throw error;
}

/** Direct VIP bump (no dialog) — for quick-action flows. */
export async function vipBumpListing(listingId: string, hours: 24 | 48 = 24): Promise<boolean> {
  try {
    await applyBump(listingId, hours);
    toast.success(`המודעה הוקפצה ל-${hours} שעות! 🚀`);
    return true;
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "שגיאה בהקפצת המודעה");
    return false;
  }
}

interface Props {
  listingId: string;
  listingTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBumped?: () => void;
}

export function BoostListingDialog({ listingId, listingTitle, open, onOpenChange, onBumped }: Props) {
  const { isVip, vipTier } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState<number | null>(null);
  const [title, setTitle] = useState<string | undefined>(listingTitle);

  const { data: options = FALLBACK_OPTIONS, isLoading: loadingPrices } = useQuery({
    queryKey: ["service_pricing", "boost"],
    queryFn: async (): Promise<BoostOption[]> => {
      const { data, error } = await (supabase as any)
        .from("service_pricing")
        .select("service_key,price,is_active")
        .in("service_key", ["boost_24h", "boost_48h"]);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ service_key: string; price: number; is_active: boolean }>;
      const mapped = rows
        .filter((r) => r.is_active && HOURS_BY_KEY[r.service_key])
        .map<BoostOption>((r) => ({
          hours: HOURS_BY_KEY[r.service_key],
          priceNis: Number(r.price),
          serviceKey: r.service_key,
        }))
        .sort((a, b) => a.hours - b.hours);
      return mapped.length ? mapped : FALLBACK_OPTIONS;
    },
    staleTime: 60_000,
  });

  const resolveTitle = async (): Promise<string> => {
    if (title) return title;
    const { data } = await supabase
      .from("marketplace_listings").select("title").eq("id", listingId).maybeSingle();
    const t = (data as { title?: string } | null)?.title ?? "מודעה";
    setTitle(t);
    return t;
  };

  const handleVipBoost = async (hours: 24 | 48) => {
    setProcessing(hours);
    const ok = await vipBumpListing(listingId, hours);
    setProcessing(null);
    if (ok) { onBumped?.(); onOpenChange(false); }
  };

  const handlePaidBoost = async (opt: BoostOption) => {
    setProcessing(opt.hours);
    try {
      const t = await resolveTitle();
      // Synthetic product id carries listingId + hours so the checkout
      // fulfillment block can extract them and bump the listing.
      add({
        id: `boost:${listingId}:${opt.hours}`,
        slug: `boost-${listingId}-${opt.hours}h`,
        title: `הקפצת מודעה: ${t} (${opt.hours} שעות)`,
        price: opt.priceNis,
        image: null,
        product_type: "marketplace_boost",
      });
      toast.success("ההקפצה נוספה לסל — מעבירים לתשלום");
      onOpenChange(false);
      navigate({ to: "/shop/checkout" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה בהוספה לסל");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-primary" />הקפץ את המודעה
          </DialogTitle>
          <DialogDescription>
            {isVip
              ? "כחלק מהמינוי שלך – ההקפצה כלולה ללא עלות."
              : "הקפצה מעלה את המודעה לראש הלוח ומשלשת את כמות הפניות."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {loadingPrices && options.length === 0 ? (
            <div className="flex items-center justify-center text-muted-foreground p-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />טוען מחירים…
            </div>
          ) : null}
          {options.map((opt: BoostOption) => (
            <div key={opt.hours} className="rounded-xl border-2 border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm">הקפצה ל-{opt.hours} שעות</div>
                <div className="text-xs text-muted-foreground">
                  המודעה תופיע בראש הלוח למשך {opt.hours} שעות.
                </div>
              </div>
              {isVip ? (
                <Button size="sm" onClick={() => handleVipBoost(opt.hours)} disabled={processing !== null} className="gap-1 shrink-0">
                  {processing === opt.hours ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                  כלול ב-{(vipTier?.name ?? "VIP")}
                </Button>
              ) : (
                <Button size="sm" onClick={() => handlePaidBoost(opt)} disabled={processing !== null} className="gap-1 shrink-0">
                  {processing === opt.hours ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                  ₪{opt.priceNis} · לסל
                </Button>
              )}
            </div>
          ))}
        </div>

        {!isVip && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Crown className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              משתמשי VIP מקבלים הקפצות חודשיות ללא עלות. <Badge variant="secondary" className="ml-1">שדרג ל-VIP</Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={processing !== null}>סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
