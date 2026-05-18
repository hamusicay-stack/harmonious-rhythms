import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_TYPES } from "@/lib/prosData";
import { toast } from "sonner";

const schema = z.object({
  sender_name: z.string().trim().min(2, "שם חובה").max(100),
  contact_phone: z.string().trim().min(7, "טלפון לא תקין").max(20),
  contact_email: z.string().trim().email("אימייל לא תקין").max(255).optional().or(z.literal("")),
  event_type: z.string().min(1, "בחר סוג אירוע"),
  event_date: z.string().optional(),
  location: z.string().trim().max(200).optional(),
  budget: z.string().optional(),
  message: z.string().trim().max(1000).optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proId: string;
  proName: string;
};

export function RequestQuoteDialog({ open, onOpenChange, proId, proName }: Props) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sender_name: profile?.display_name ?? "",
    contact_phone: "",
    contact_email: user?.email ?? "",
    event_type: "wedding",
    event_date: "",
    location: "",
    budget: "",
    message: "",
  });

  const submit = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לשלוח בקשה");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("music_pro_inquiries").insert({
      pro_id: proId,
      sender_id: user.id,
      sender_name: form.sender_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim() || null,
      event_type: form.event_type,
      event_date: form.event_date || null,
      location: form.location.trim() || null,
      budget: form.budget ? Number(form.budget) : null,
      message: form.message.trim() || null,
    });

    // Best-effort lead in CRM (will be ignored if RLS blocks)
    await supabase.from("leads").insert({
      name: form.sender_name.trim(),
      email: form.contact_email.trim() || null,
      phone: form.contact_phone.trim(),
      source: "website",
      status: "new",
      notes: `בקשה למוזיקאי: ${proName}\nסוג אירוע: ${form.event_type}\n${form.message}`,
    });

    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("הבקשה נשלחה — המוזיקאי יחזור אליך בהקדם");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>בקשת הצעת מחיר — {proName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>שם מלא *</Label>
              <Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>טלפון *</Label>
              <Input dir="ltr" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>אימייל</Label>
            <Input dir="ltr" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>סוג אירוע *</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>תאריך</Label>
              <Input type="date" dir="ltr" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>מיקום</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>תקציב משוער (₪)</Label>
              <Input type="number" dir="ltr" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>הודעה</Label>
            <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
            שלח בקשה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
