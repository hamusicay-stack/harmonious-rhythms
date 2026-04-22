import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REASONS = [
  { value: "scam", label: "נראה כהונאה / מודעת רמייה" },
  { value: "inappropriate", label: "תוכן לא ראוי / פוגעני" },
  { value: "duplicate", label: "מודעה כפולה" },
  { value: "wrong_category", label: "קטגוריה שגויה" },
  { value: "sold", label: "המוצר כבר נמכר" },
  { value: "other", label: "אחר" },
];

interface Props {
  listingId: string;
  variant?: "ghost" | "outline";
  size?: "sm" | "default";
}

export function ReportListingDialog({ listingId, variant = "ghost", size = "sm" }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר כדי לדווח"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("marketplace_reports").insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("הדיווח נשלח לבדיקה. תודה!");
    setOpen(false);
    setDetails("");
    setReason("scam");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-1 text-muted-foreground hover:text-rose-500">
          <Flag className="h-4 w-4" />
          דווח על מודעה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>דיווח על תוכן לא ראוי</DialogTitle>
          <DialogDescription>הדיווח שלך יישלח לבדיקת הצוות. כל הדיווחים אנונימיים מול המוכר.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>סיבת הדיווח</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer rounded-md p-2 hover:bg-muted">
                  <RadioGroupItem value={r.value} id={`r-${r.value}`} />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>פרטים נוספים (אופציונלי)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="ספר לנו עוד על הבעיה..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={submit} disabled={submitting} variant="destructive">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              שלח דיווח
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
