import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Loader2, Coins } from "lucide-react";

type LedgerRow = {
  id: string;
  event_key: string;
  points: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  shop_purchase: "רכישה בחנות",
  lesson_complete: "השלמת שיעור",
  course_complete: "השלמת קורס",
  forum_topic_create: "פתיחת אשכול בפורום",
  forum_post_create: "תגובה בפורום",
  forum_received_upvote: "הצבעה חיובית בפורום",
  forum_solution_accepted: "תשובה התקבלה כפתרון",
  marketplace_purchase: "רכישה ביד 2",
  marketplace_sale: "מכירה ביד 2",
  redeem_shop_order: "מימוש בחנות",
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export function MyPointsTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [perNis, setPerNis] = useState<number>(100);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [ledgerRes, balRes, setRes] = await Promise.all([
        (supabase as any)
          .from("points_ledger")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("user_points")
          .select("total_points")
          .eq("user_id", userId)
          .maybeSingle(),
        (supabase as any)
          .from("points_settings")
          .select("points_per_nis")
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (!alive) return;
      setRows((ledgerRes.data ?? []) as LedgerRow[]);
      setTotalPoints(Number(balRes.data?.total_points ?? 0));
      setPerNis(Number(setRes.data?.points_per_nis ?? 100));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const nisValue = perNis > 0 ? (totalPoints / perNis).toFixed(2) : "0.00";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-background to-background">
        <CardContent className="flex flex-col items-start gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-500/15 p-4 ring-1 ring-amber-500/30">
              <Coins className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">היתרה שלך</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-amber-400">
                  {totalPoints.toLocaleString("he-IL")}
                </span>
                <span className="text-sm text-muted-foreground">נקודות</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                שווה ערך ל-<span className="font-semibold text-foreground">₪{nisValue}</span> הנחה בחנות
                <span className="mx-1">·</span>
                <span className="text-xs">{perNis} נק' = ₪1</span>
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="gap-2 bg-amber-500 text-amber-950 hover:bg-amber-400">
            <Link to="/shop">
              <Sparkles className="h-4 w-4" />
              ממש את הנקודות בחנות
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">אין עדיין תנועות נקודות</p>
              <p className="mt-1 text-sm text-muted-foreground">
                השלם קורסים, פעיל בפורום או רכוש בחנות כדי לצבור נקודות.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const positive = r.points >= 0;
                const label = EVENT_LABELS[r.event_key] ?? r.event_key;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={
                          "rounded-full p-2 " +
                          (positive
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500")
                        }
                      >
                        {positive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(r.created_at)}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        positive
                          ? "border-emerald-500/40 text-emerald-500"
                          : "border-rose-500/40 text-rose-500"
                      }
                    >
                      {positive ? "+" : ""}
                      {r.points.toLocaleString("he-IL")}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
