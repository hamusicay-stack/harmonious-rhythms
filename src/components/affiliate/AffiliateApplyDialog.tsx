import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function AffiliateApplyDialog({ children, onApplied }: { children: React.ReactNode; onApplied?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [audience, setAudience] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (reason.trim().length < 10) { toast.error("ספר לנו קצת יותר (מינימום 10 תווים)"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("affiliate_applications").insert({
      user_id: user.id, reason: reason.trim(), audience: audience.trim() || null, status: "pending",
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("unique") || error.code === "23505") {
        toast.error("יש לך כבר בקשה ממתינה");
      } else toast.error(error.message);
      return;
    }
    toast.success("הבקשה נשלחה! נודיע לך כשתאושר");
    setOpen(false); setReason(""); setAudience("");
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            הצטרף כשותף (Affiliate)
          </DialogTitle>
          <DialogDescription>
            כשותף תקבל לינק ייחודי לכל מוצר וקורס. כל רכישה דרכך = עמלה אצלך.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>למה תרצה להצטרף? *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3}
              placeholder="ספר על עצמך — למה אתה מתאים?" />
          </div>
          <div>
            <Label>קהל היעד שלך</Label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={200}
              placeholder="לדוגמה: 5000 עוקבים באינסטגרם, קהילת מוזיקאים..." />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
            {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            שלח בקשה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
