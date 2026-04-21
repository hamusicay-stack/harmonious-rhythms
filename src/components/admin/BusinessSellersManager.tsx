import { useEffect, useState } from "react";
import { Briefcase, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BusinessSeller = {
  id: string; user_id: string; business_name: string; contact_name: string | null;
  phone: string | null; email: string | null; subscription_status: string;
  subscription_expires_at: string | null;
};

export function BusinessSellersManager() {
  const [sellers, setSellers] = useState<BusinessSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_email: "", business_name: "", contact_name: "", phone: "", email: "", expires_at: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketplace_business_sellers").select("*").order("created_at", { ascending: false });
    setSellers((data ?? []) as BusinessSeller[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addSeller = async () => {
    if (!form.user_email.trim() || !form.business_name.trim()) { toast.error("מייל המשתמש ושם העסק חובה"); return; }
    setSaving(true);
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", form.user_email.trim().toLowerCase()).maybeSingle();
    if (!prof) { toast.error("לא נמצא משתמש עם מייל זה. עליו להירשם תחילה."); setSaving(false); return; }
    const { error } = await supabase.from("marketplace_business_sellers").insert({
      user_id: prof.id,
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || form.user_email.trim(),
      subscription_status: "active",
      subscription_expires_at: form.expires_at || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("מוכר עסקי נוסף");
    setForm({ user_email: "", business_name: "", contact_name: "", phone: "", email: "", expires_at: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("להסיר את המוכר העסקי?")) return;
    const { error } = await supabase.from("marketplace_business_sellers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("הוסר");
    load();
  };

  const toggleStatus = async (s: BusinessSeller) => {
    const next = s.subscription_status === "active" ? "expired" : "active";
    await supabase.from("marketplace_business_sellers").update({ subscription_status: next }).eq("id", s.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" />מוכרים עסקיים</h3>
          <p className="text-xs text-muted-foreground mt-1">מוכרים עם מנוי פעיל יקבלו תג "עסקי" אוטומטית במודעות שלהם.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />הוסף מוכר עסקי</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת מוכר עסקי</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>מייל המשתמש (חייב להיות רשום)</Label>
                <Input value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>שם העסק</Label>
                <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>איש קשר</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>טלפון</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>תאריך סיום מנוי (אופציונלי)</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
              <Button onClick={addSeller} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sellers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed">אין מוכרים עסקיים עדיין</div>
      ) : (
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {s.business_name}
                  <Badge variant={s.subscription_status === "active" ? "default" : "secondary"}>
                    {s.subscription_status === "active" ? "פעיל" : "פג"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.contact_name && `${s.contact_name} · `}{s.phone}
                  {s.subscription_expires_at && ` · עד ${new Date(s.subscription_expires_at).toLocaleDateString("he-IL")}`}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleStatus(s)}>
                {s.subscription_status === "active" ? "השבת" : "הפעל"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
