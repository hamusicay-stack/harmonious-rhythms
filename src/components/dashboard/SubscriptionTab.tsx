import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Crown, Sparkles, GraduationCap, Piano, Ban, CreditCard, X } from "lucide-react";

function formatNextBilling(): string {
  // Mock until billing integration (Stripe / Cardcom) is wired up.
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
}

export function SubscriptionTab() {
  const { isVip, vipTier, profile } = useAuth();

  if (!isVip) {
    return (
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-background via-primary/5 to-amber-500/10">
        <CardContent className="space-y-6 p-8 md:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-amber-500/15 p-4">
              <Crown className="h-10 w-10 text-amber-400" />
            </div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">שדרג ל-VIP</h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              קבל גישה לכל היתרונות הפרימיום של המוזיקאי — ללא פרסומות, קורסים מתקדמים והאורגן הוירטואלי המלא.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
              <Ban className="mx-auto mb-2 h-6 w-6 text-rose-400" />
              <div className="text-sm font-semibold">ללא פרסומות</div>
              <p className="mt-1 text-xs text-muted-foreground">חוויית גלישה נקייה לחלוטין</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
              <GraduationCap className="mx-auto mb-2 h-6 w-6 text-primary" />
              <div className="text-sm font-semibold">קורסי פרימיום</div>
              <p className="mt-1 text-xs text-muted-foreground">גישה לכל הקטלוג + הנחות</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
              <Piano className="mx-auto mb-2 h-6 w-6 text-amber-400" />
              <div className="text-sm font-semibold">פיצ'רים של אורגן</div>
              <p className="mt-1 text-xs text-muted-foreground">חבילות צלילים וקצבים מתקדמים</p>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-gold hover:from-amber-400 hover:to-amber-300">
              <Link to="/shop">
                <Sparkles className="h-5 w-5" />
                בחר חבילת VIP
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = vipTier?.name ?? "VIP";
  const nextBilling = formatNextBilling();
  const tierId = (profile as any)?.global_subscription_tier_id ?? null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-primary/5">
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/15 p-3">
                <Crown className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">מנוי פעיל</div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">{tierName}</h2>
              </div>
            </div>
            <Badge className="bg-emerald-500 hover:bg-emerald-500">פעיל</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">חיוב הבא (משוער)</div>
              <div className="mt-1 text-lg font-semibold">{nextBilling}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">מזהה מנוי</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {tierId ? `${tierId.slice(0, 8)}…` : "—"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border/40 pt-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => toast.info("ניהול חיוב יחובר בקרוב לאחר חיבור ספק הסליקה")}
            >
              <CreditCard className="h-4 w-4" />
              נהל חיוב
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => toast.info("ביטול מנוי יחובר בקרוב לאחר חיבור ספק הסליקה")}
            >
              <X className="h-4 w-4" />
              בטל מנוי
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
          <Ban className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
          <div className="text-sm font-semibold">ללא פרסומות</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
          <GraduationCap className="mx-auto mb-2 h-5 w-5 text-primary" />
          <div className="text-sm font-semibold">גישה לכל הקורסים</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
          <Piano className="mx-auto mb-2 h-5 w-5 text-amber-400" />
          <div className="text-sm font-semibold">אורגן מלא</div>
        </div>
      </div>
    </div>
  );
}
