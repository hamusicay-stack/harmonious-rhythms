import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, CheckCircle2, Circle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ORGAN_MODELS, type Customer, type Lead, type Supplier, type Task } from "./types";

export function StatCard({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/60 shadow-gold" : ""}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          {icon}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerEditDialog({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: customer.full_name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    user_type: customer.user_type,
    organ_model: customer.organ_model ?? "",
    subscription_tier: customer.subscription_tier,
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      phone: form.phone || null,
      email: form.email || null,
      user_type: form.user_type,
      organ_model: form.organ_model || null,
      subscription_tier: form.subscription_tier,
    }).eq("id", customer.id);
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("הלקוח עודכן");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">עריכה</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>עריכת לקוח</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>שם מלא</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>אימייל</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>סוג משתמש</Label>
              <Select value={form.user_type} onValueChange={(v) => setForm({ ...form, user_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">לקוח</SelectItem>
                  <SelectItem value="supplier">ספק</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>רמת מנוי</Label>
              <Select value={form.subscription_tier} onValueChange={(v) => setForm({ ...form, subscription_tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">חינם</SelectItem>
                  <SelectItem value="basic">בסיסי</SelectItem>
                  <SelectItem value="premium">פרימיום</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>דגם אורגן</Label>
            <Select value={form.organ_model || "none"} onValueChange={(v) => setForm({ ...form, organ_model: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="בחר דגם" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {ORGAN_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadStatusSelect({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const update = async (status: string) => {
    const { error } = await supabase.from("leads").update({ status: status as "new" | "in_progress" | "converted" | "lost" }).eq("id", lead.id);
    if (error) { toast.error(friendlyError(error)); return; }
    onChanged();
  };
  return (
    <Select value={lead.status} onValueChange={update}>
      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="new">חדש</SelectItem>
        <SelectItem value="in_progress">בטיפול</SelectItem>
        <SelectItem value="converted">הוסב</SelectItem>
        <SelectItem value="lost">אבד</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SupplierEditDialog({ supplier, onSaved }: { supplier?: Supplier; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: supplier?.company_name ?? "",
    contact_name: supplier?.contact_name ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    category: supplier?.category ?? "other",
    custom_category: (supplier as (Supplier & { custom_category?: string }) | undefined)?.custom_category ?? "",
    is_active: supplier?.is_active ?? true,
    payment_notes: supplier?.payment_notes ?? "",
  });

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("שם חברה חובה"); return; }
    if (form.category === "other" && !form.custom_category.trim()) {
      toast.error("פרט קטגוריה מותאמת");
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      category: form.category as "rhythms" | "equipment" | "courses" | "other",
      custom_category: form.category === "other" ? form.custom_category.trim() : null,
      is_active: form.is_active,
      payment_notes: form.payment_notes || null,
    };
    const { error } = supplier
      ? await supabase.from("suppliers").update(payload).eq("id", supplier.id)
      : await supabase.from("suppliers").insert(payload);
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(supplier ? "הספק עודכן" : "ספק נוסף");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier
          ? <Button size="sm" variant="outline">עריכה</Button>
          : <Button size="sm"><Plus className="ml-2 h-4 w-4" />ספק חדש</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{supplier ? "עריכת ספק" : "ספק חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>שם חברה *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>איש קשר</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rhythms">מקצבים</SelectItem>
                  <SelectItem value="equipment">ציוד</SelectItem>
                  <SelectItem value="courses">קורסים</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.category === "other" && (
            <div className="space-y-2">
              <Label>פרט קטגוריה</Label>
              <Input
                placeholder="לדוגמה: שירותי הקלטה"
                value={form.custom_category}
                onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
              />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>אימייל</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>הערות תשלום</Label><Textarea rows={3} value={form.payment_notes} onChange={(e) => setForm({ ...form, payment_notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskEditDialog({ customers, onSaved }: { customers: Customer[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deals, setDeals] = useState<{ id: string; title: string | null; customer_name: string }[]>([]);
  const [orders, setOrders] = useState<{ id: string; order_number: string }[]>([]);
  const [pros, setPros] = useState<{ id: string; display_name: string | null; stage_name: string | null }[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", priority: "normal" as Task["priority"],
    due_date: "", related_customer_id: "none",
    related_deal_id: "none", related_order_id: "none", related_pro_id: "none",
  });

  const loadRelated = async () => {
    const [d, o, p] = await Promise.all([
      supabase.from("deals").select("id, title, customer_name").order("created_at", { ascending: false }).limit(100),
      supabase.from("shop_orders").select("id, order_number").order("created_at", { ascending: false }).limit(100),
      supabase.from("music_pros").select("id, display_name, stage_name").order("created_at", { ascending: false }).limit(100),
    ]);
    setDeals((d.data ?? []) as any);
    setOrders((o.data ?? []) as any);
    setPros((p.data ?? []) as any);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("כותרת חובה"); return; }
    setSaving(true);
    const { error } = await supabase.from("admin_tasks").insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      related_customer_id: form.related_customer_id === "none" ? null : form.related_customer_id,
      related_deal_id: form.related_deal_id === "none" ? null : form.related_deal_id,
      related_order_id: form.related_order_id === "none" ? null : form.related_order_id,
      related_pro_id: form.related_pro_id === "none" ? null : form.related_pro_id,
    });
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("המשימה נוספה");
    setOpen(false);
    setForm({ title: "", description: "", priority: "normal", due_date: "", related_customer_id: "none", related_deal_id: "none", related_order_id: "none", related_pro_id: "none" });
    onSaved();
  };


  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadRelated(); }}>
      <DialogTrigger asChild><Button size="sm"><Plus className="ml-2 h-4 w-4" />משימה חדשה</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>משימה חדשה</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>כותרת *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>תיאור</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>עדיפות</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחופה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>תאריך יעד</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>שייך ללקוח</Label>
            <Select value={form.related_customer_id} onValueChange={(v) => setForm({ ...form, related_customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name || c.full_name || c.email || c.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>שייך לעסקה (Deal)</Label>
            <Select value={form.related_deal_id} onValueChange={(v) => setForm({ ...form, related_deal_id: v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title || d.customer_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>שייך להזמנה</Label>
            <Select value={form.related_order_id} onValueChange={(v) => setForm({ ...form, related_order_id: v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>#{o.order_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>שייך לאיש מקצוע</Label>
            <Select value={form.related_pro_id} onValueChange={(v) => setForm({ ...form, related_pro_id: v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {pros.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.stage_name || p.display_name || p.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  urgent: "bg-destructive/20 text-destructive",
};

export function TaskRow({ task, customers, onChanged }: { task: Task; customers: Customer[]; onChanged: () => void }) {
  const cycle = async () => {
    const next = task.status === "open" ? "in_progress" : task.status === "in_progress" ? "done" : "open";
    const { error } = await supabase.from("admin_tasks").update({ status: next }).eq("id", task.id);
    if (error) { toast.error(friendlyError(error)); return; }
    onChanged();
  };
  const remove = async () => {
    const { error } = await supabase.from("admin_tasks").delete().eq("id", task.id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("המשימה נמחקה");
    onChanged();
  };
  const customer = customers.find((c) => c.id === task.related_customer_id);
  const Icon = task.status === "done" ? CheckCircle2 : task.status === "in_progress" ? Clock : Circle;

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border/60 p-3 ${task.status === "done" ? "opacity-60" : ""}`}>
      <button onClick={cycle} className="mt-0.5 text-primary hover:scale-110 transition-transform" aria-label="שינוי סטטוס">
        <Icon className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${task.status === "done" ? "line-through" : ""}`}>{task.title}</span>
          <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">{task.priority}</Badge>
          {customer && <Badge variant="outline">לקוח: {customer.display_name || customer.full_name || "—"}</Badge>}
          {task.due_date && <span className="text-xs text-muted-foreground">יעד: {new Date(task.due_date).toLocaleDateString("he-IL")}</span>}
        </div>
        {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
      </div>
      <Button size="sm" variant="ghost" onClick={remove} className="text-destructive">מחק</Button>
    </div>
  );
}
