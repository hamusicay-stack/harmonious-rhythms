import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import { Star, ShieldCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  sellerId: string;
  listingTitle?: string | null;
  onSubmitted?: () => void;
};

export function VerifiedReviewDialog({ open, onOpenChange, listingId, sellerId, listingTitle, onSubmitted }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (rating < 1 || rating > 5) { toast.error("בחרו דירוג"); return; }
    setBusy(true);
    const { error } = await supabase.from("marketplace_reviews").insert({
      seller_id: sellerId,
      reviewer_id: user.id,
      listing_id: listingId,
      rating,
      comment: comment.trim() || null,
      is_verified_purchase: true,
    } as never);
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("חוות הדעת המאומתת נשלחה ✨");
    setComment(""); setRating(5);
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            חוות דעת מאומתת
          </DialogTitle>
          <DialogDescription>
            {listingTitle ? <>על הפריט: <span className="font-semibold">{listingTitle}</span></> : "שתפו את החוויה שלכם מהעסקה"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={(e) => { e.stopPropagation(); setRating(n); }}
                className="p-1"
                aria-label={`דרג ${n} כוכבים`}
              >
                <Star className={cn("h-7 w-7 transition", (hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="איך הייתה העסקה? איכות הפריט, אמינות המוכר…"
            rows={5}
            maxLength={1500}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onOpenChange(false); }} disabled={busy}>ביטול</Button>
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))]"
            >
              {busy ? <Loader2 className="ms-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="ms-1 h-4 w-4" />}
              פרסם חוות דעת מאומתת
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
