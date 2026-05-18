import { friendlyError } from "@/lib/errors";
import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldQuestion, Loader2, PenSquare, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VerifiedReviewDialog } from "@/components/marketplace/VerifiedReviewDialog";

type Row = {
  id: string;
  listing_id: string;
  seller_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  listing_title: string | null;
  listing_thumb: string | null;
  listing_price: number | null;
  seller_name: string | null;
  already_reviewed: boolean;
};

type Props = {
  userId: string;
  /** When provided, automatically opens the verified-review modal for this listing on mount. */
  autoOpenReviewForListing?: string | null;
};

export function MyPurchasesTab({ userId, autoOpenReviewForListing }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Row | null>(null);

  const load = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data: confs, error } = await supabase
      .from("marketplace_deal_confirmations")
      .select("id, listing_id, seller_id, status, created_at, responded_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });
    if (error) { toast.error(friendlyError(error)); setLoading(false); return; }
    const list = confs ?? [];
    if (list.length === 0) { setRows([]); setLoading(false); return; }
    const listingIds = Array.from(new Set(list.map((r) => r.listing_id)));
    const sellerIds = Array.from(new Set(list.map((r) => r.seller_id)));
    const [{ data: listings }, { data: sellers }, { data: myReviews }] = await Promise.all([
      supabase.from("marketplace_listings").select("id, title, price, images").in("id", listingIds),
      supabase.from("profiles").select("id, display_name").in("id", sellerIds),
      supabase.from("marketplace_reviews").select("listing_id").eq("reviewer_id", userId).in("listing_id", listingIds),
    ]);
    const reviewedSet = new Set((myReviews ?? []).map((r: { listing_id: string | null }) => r.listing_id).filter(Boolean) as string[]);
    setRows(list.map((r) => {
      const l = (listings ?? []).find((x: { id: string }) => x.id === r.listing_id);
      const images = (l as { images?: unknown } | undefined)?.images as unknown;
      const thumb = Array.isArray(images) && typeof images[0] === "string" ? (images[0] as string) : null;
      return {
        id: r.id,
        listing_id: r.listing_id,
        seller_id: r.seller_id,
        status: r.status,
        created_at: r.created_at,
        responded_at: r.responded_at,
        listing_title: (l as { title?: string } | undefined)?.title ?? null,
        listing_thumb: thumb,
        listing_price: (l as { price?: number } | undefined)?.price ?? null,
        seller_name: (sellers ?? []).find((s: { id: string }) => s.id === r.seller_id)?.display_name ?? null,
        already_reviewed: reviewedSet.has(r.listing_id),
      };
    }));
    setLoading(false);
  }, [user, userId]);

  useEffect(() => { void load(); }, [load]);

  // Auto-open review modal when deep-linked from chat
  useEffect(() => {
    if (!autoOpenReviewForListing || loading) return;
    const match = rows.find((r) => r.listing_id === autoOpenReviewForListing && r.status === "confirmed" && !r.already_reviewed);
    if (match) setReviewTarget(match);
  }, [autoOpenReviewForListing, loading, rows]);

  const respond = async (e: React.MouseEvent, id: string, status: "confirmed" | "rejected") => {
    e.preventDefault(); e.stopPropagation();
    setBusyId(id);
    const { error } = await supabase
      .from("marketplace_deal_confirmations")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(status === "confirmed" ? "אישרת את הרכישה" : "סימנת שלא רכשת");
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <h3 className="text-lg font-semibold">עדיין אין רכישות מאומתות</h3>
        <p className="mt-1 text-sm text-muted-foreground">כשמוכר יסמן עסקה איתך — היא תופיע כאן לאישור ולכתיבת ביקורת.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <article
            key={r.id}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm transition",
              r.status === "pending_buyer_confirmation" && "border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-[0_0_30px_-10px_hsl(var(--primary))]",
              r.status === "confirmed" && "border-primary/30",
              r.status === "rejected" && "opacity-60",
            )}
          >
            <div className="flex gap-3">
              <Link
                to="/marketplace/$listingId"
                params={{ listingId: r.listing_id }}
                className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border"
                onClick={(e) => e.stopPropagation()}
              >
                {r.listing_thumb ? (
                  <img src={r.listing_thumb} alt={r.listing_title ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">ללא תמונה</div>
                )}
              </Link>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start gap-2">
                  <Link
                    to="/marketplace/$listingId"
                    params={{ listingId: r.listing_id }}
                    className="line-clamp-2 text-sm font-semibold hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.listing_title || "פריט"}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  מוכר: <span className="font-medium text-foreground/80">{r.seller_name || "משתמש"}</span>
                  {r.listing_price ? <> · ₪{r.listing_price.toLocaleString("he-IL")}</> : null}
                </div>
                <StatusPill status={r.status} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 pt-1">
              {r.status === "pending_buyer_confirmation" ? (
                <>
                  <Button
                    size="sm"
                    onClick={(e) => respond(e, r.id, "confirmed")}
                    disabled={busyId === r.id}
                    className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                  >
                    {busyId === r.id ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="ml-1 h-3.5 w-3.5" />}
                    כן, רכשתי!
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => respond(e, r.id, "rejected")} disabled={busyId === r.id}>
                    <X className="ml-1 h-3.5 w-3.5" />לא קניתי
                  </Button>
                </>
              ) : r.status === "confirmed" && !r.already_reviewed ? (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setReviewTarget(r); }}
                  className="relative bg-gradient-to-r from-primary via-primary to-primary/70 text-primary-foreground shadow-[0_0_28px_-6px_hsl(var(--primary))] hover:shadow-[0_0_36px_-4px_hsl(var(--primary))]"
                >
                  <PenSquare className="ml-1 h-3.5 w-3.5" />
                  ✍️ כתוב חוות דעת מקצועית
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                </Button>
              ) : r.status === "confirmed" ? (
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />חוות הדעת שלך נשמרה
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">סימנת שלא רכשת.</div>
              )}
            </div>
          </article>
        ))}
      </div>

      {reviewTarget ? (
        <VerifiedReviewDialog
          open={!!reviewTarget}
          onOpenChange={(v) => { if (!v) setReviewTarget(null); }}
          listingId={reviewTarget.listing_id}
          sellerId={reviewTarget.seller_id}
          listingTitle={reviewTarget.listing_title}
          onSubmitted={() => { setReviewTarget(null); void load(); }}
        />
      ) : null}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "pending_buyer_confirmation") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
        <ShieldQuestion className="h-3 w-3" />ממתין לאישורך
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <BadgeCheck className="h-3 w-3" />עסקה מאומתת
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      סורבה
    </span>
  );
}
