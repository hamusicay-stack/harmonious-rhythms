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
import { Loader2, Send, CheckCircle2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_TYPES } from "@/lib/prosData";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

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
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
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

    if (error) {
      setSaving(false);
      toast.error(friendlyError(error));
      return;
    }

    // Locate the auto-created PRO chat thread for this user + pro
    const { data: pro } = await supabase
      .from("music_pros")
      .select("user_id")
      .eq("id", proId)
      .maybeSingle();

    let threadId: string | null = null;
    if (pro?.user_id && pro.user_id !== user.id) {
      const [a, b] = [user.id, pro.user_id].sort();
      const { data: t } = await supabase
        .from("core_chat_threads")
        .select("id")
        .eq("context_type", "PRO")
        .eq("user_a", a)
        .eq("user_b", b)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      threadId = t?.id ?? null;
    }

    setSaving(false);
    setSuccess(true);
    toast.success("הבקשה נשלחה — נפתח שיחה ישירה עם המוזיקאי");

    // Redirect to the central chat with the new thread pre-selected
    setTimeout(() => {
      onOpenChange(false);
      setSuccess(false);
      navigate({
        to: "/profile",
        search: {
          tab: "messages",
          ...(threadId ? { thread: `core:${threadId}` } : {}),
        } as never,
      });
    }, 1600);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving && !success) onOpenChange(v); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl">
                <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">הבקשה נשלחה!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                פותח/ת לך שיחה חיה עם {proName}…
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary">
              <MessageCircle className="h-4 w-4 animate-pulse" />
              מעביר/ה לצ׳אט
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-end">בקשת הצעת מחיר — {proName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-end">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>שם מלא *</Label>
                  <Input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>טלפון *</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>אימייל</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
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
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>מיקום</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>תקציב משוער (₪)</Label>
                  <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
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
                {saving ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <Send className="ms-2 h-4 w-4" />}
                שלח בקשה ופתח שיחה
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
