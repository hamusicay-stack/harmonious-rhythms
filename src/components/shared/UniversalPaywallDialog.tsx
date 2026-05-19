import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Star, Check, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export type PaywallTier = {
  id: string;
  slug: string;
  name: string;
  rank: number;
  is_vip: boolean;
  description: string | null;
  shop_discount_percent: number | null;
  academy_discount_percent: number | null;
  marketplace_free_boosts: number | null;
  beat_access: boolean | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Optional list of extra benefits shown ONLY on VIP-flagged tiers (e.g. "יומן אירועים פרטי"). */
  vipBonusBenefits?: string[];
  /** Tier rank required to unlock the gated feature. Tiers below this are dimmed. */
  requiredRank?: number;
  ctaHref?: string;
  ctaLabel?: string;
};

/**
 * Single source of truth for the upgrade dialog across the entire site.
 * Reads live tiers from `subscription_tiers` and highlights the user's
 * current tier (from `profiles.global_subscription_tier_id`).
 */
export function UniversalPaywallDialog({
  isOpen,
  onClose,
  title = "שדרוג נדרש",
  description = "התכונה הזו זמינה למנויי פרימיום ו-VIP בלבד.",
  vipBonusBenefits = [],
  requiredRank,
  ctaHref = "/profile",
  ctaLabel = "שדרג עכשיו",
}: Props) {
  const { vipTier } = useAuth();
  const [tiers, setTiers] = useState<PaywallTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as never as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string, o: { ascending: boolean }) => Promise<{ data: PaywallTier[] | null }>;
          };
        };
      })
        .from("subscription_tiers")
        .select("id, slug, name, rank, is_vip, description, shop_discount_percent, academy_discount_percent, marketplace_free_boosts, beat_access")
        .order("rank", { ascending: true });
      if (!cancelled) {
        setTiers(data ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const buildBenefits = (t: PaywallTier): string[] => {
    const out: string[] = [];
    if (t.shop_discount_percent) out.push(`${t.shop_discount_percent}% הנחה בחנות`);
    if (t.academy_discount_percent) out.push(`${t.academy_discount_percent}% הנחה באקדמיה`);
    if (t.marketplace_free_boosts) out.push(`${t.marketplace_free_boosts} בוסטים חינם ביד 2`);
    if (t.beat_access) out.push("גישה ל-Beat / Smart Rhythms");
    if (t.is_vip) {
      out.push("גישה מלאה לכל קורסי האקדמיה");
      out.push("בולט במנוע החיפוש (VIP Badge)");
      for (const b of vipBonusBenefits) out.push(b);
    }
    if (out.length === 0) out.push("הטבות בסיסיות");
    return out;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl border-amber-400/30 bg-gradient-to-br from-background/95 via-background/90 to-amber-950/20 backdrop-blur-2xl shadow-[0_20px_80px_-20px_rgba(251,191,36,0.35)]"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/30">
              <Crown className="h-6 w-6 text-black" />
            </div>
            <div className="text-right flex-1">
              <DialogTitle className="text-right text-xl">{title}</DialogTitle>
              <DialogDescription className="text-right text-xs mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            {tiers.map((t) => {
              const isCurrent = vipTier?.id === t.id;
              const meetsRequirement = requiredRank == null ? true : t.rank >= requiredRank;
              const benefits = buildBenefits(t);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "relative rounded-2xl border p-4 backdrop-blur-md transition-all flex flex-col",
                    t.is_vip
                      ? "border-amber-400/50 bg-gradient-to-br from-amber-500/[0.08] to-amber-900/10 shadow-[0_8px_30px_-10px_rgba(251,191,36,0.4)]"
                      : "border-border/60 bg-card/40",
                    isCurrent && "ring-2 ring-amber-300/70",
                    !meetsRequirement && "opacity-50",
                  )}
                >
                  {isCurrent && (
                    <span className="absolute top-2 left-2 rounded-full bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5">
                      הדרגה שלך
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.is_vip ? <Crown className="h-4 w-4 text-amber-300" /> : <Star className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-bold text-base">{t.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">rank {t.rank}</span>
                  </div>
                  {t.description && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <ul className="mt-3 space-y-1.5 text-[12px] text-right flex-1">
                    {benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5 justify-end">
                        <span className="leading-tight">{b}</span>
                        <Check className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", t.is_vip ? "text-amber-300" : "text-muted-foreground")} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2 mt-3">
          <Button variant="outline" onClick={onClose}>סגור</Button>
          <Button asChild className="bg-gradient-to-br from-amber-400 to-amber-600 text-black hover:brightness-110">
            <Link to={ctaHref}>
              <Crown className="ml-2 h-4 w-4" /> {ctaLabel}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
