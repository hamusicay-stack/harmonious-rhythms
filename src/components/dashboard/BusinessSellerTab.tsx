import { friendlyError } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

export function BusinessSellerTab({ userId, email }: { userId: string; email: string }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ business_name: "", contact_name: "", phone: "", email: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_business_sellers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setAccount(data);
    if (data) {
      setForm({
        business_name: data.business_name ?? "",
        contact_name: data.contact_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? email,
      });
    } else {
      setForm({ business_name: "", contact_name: "", phone: "", email });
    }
    setLoading(false);
  }, [userId, email]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.business_name.trim()) { toast.error("שם העסק חובה"); return; }
    setSaving(true);
    const payload = {
      user_id: userId,
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || email,
      subscription_status: "active",
    };
    const { error } = account
      ? await supabase.from("marketplace_business_sellers").update(payload).eq("user_id", userId)
      : await supabase.from("marketplace_business_sellers").insert(payload);
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(account ? "פרטי העסק עודכנו" : "נרשמת כמוכר עסקי!");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-3xl border border-border/60 bg-card-elevated p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">{account ? "פרטי העסק" : "הירשם כמוכר עסקי"}</h2>
          <p className="text-xs text-muted-foreground">
            {account ? `סטטוס: ${account.subscription_status === "active" ? "פעיל" : account.subscription_status}` : "המודעות שלך יסומנו עם תג 'עסקי' ויקבלו חשיפה משופרת"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>שם העסק *</Label>
        <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="למשל: כלי נגינה ירושלים" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>איש קשר</Label>
          <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>טלפון</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>אימייל</Label>
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
          {account ? "שמור שינויים" : "הירשם כמוכר עסקי"}
        </Button>
      </div>
    </div>
  );
}
