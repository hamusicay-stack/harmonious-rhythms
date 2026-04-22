import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proId: string;
  proName: string;
  onSubmitted?: () => void;
};

export function AddReviewDialog({ open, onOpenChange, proId, proName, onSubmitted }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי להגיש ביקורת");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("music_pro_reviews").insert({
      pro_id: proId,
      reviewer_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("הביקורת נשלחה ותוצג לאחר אישור המוזיקאי");
    setComment("");
    setRating(5);
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">דירוג ל-{proName}</DialogTitle>
          <DialogDescription className="text-right">
            הביקורת תוצג לאחר אישור ידני של המוזיקאי.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <div>
            <p className="mb-2 text-sm font-medium">דירוג</p>
            <div className="flex flex-row-reverse justify-end gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${n} כוכבים`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      n <= (hover || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">חוות דעת (לא חובה)</p>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ספר על החוויה..."
            />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
            {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            שלח ביקורת
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
