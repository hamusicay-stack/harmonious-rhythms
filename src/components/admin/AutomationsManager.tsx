import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Save, Trash2, Pencil, Zap, Mail, MessageSquare, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_condition: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
};

const TRIGGERS = [
  { value: "lead_status_changed", label: "סטטוס ליד השתנה" },
  { value: "new_lead_created", label: "ליד חדש נוצר" },
  { value: "order_paid", label: "הזמנה שולמה" },
  { value: "subscription_expiring", label: "מנוי עומד להסתיים (יומיים לפני)" },
  { value: "supplier_order_status_changed", label: "סטטוס הזמנת רכש השתנה" },
];

const ACTIONS = [
  { value: "send_message", label: "שלח הודעה (WhatsApp / Email)", icon: MessageSquare },
  { value: "send_email", label: "שליחת מייל בלבד", icon: Mail },
  { value: "open_whatsapp", label: "WhatsApp בלבד", icon: MessageSquare },
  { value: "create_task", label: "יצירת משימה", icon: ListTodo },
];

// Actions that participate in the omnichannel fallback (WhatsApp → Email)
const SMART_ROUTING_ACTIONS = new Set(["send_message"]);

const LEAD_STATUSES = [
  { value: "new", label: "חדש" },
  { value: "in_progress", label: "בטיפול" },
  { value: "converted", label: "הומר ללקוח" },
  { value: "lost", label: "אבוד" },
];

const triggerLabel = (v: string) => TRIGGERS.find((t) => t.value === v)?.label ?? v;
const actionLabel = (v: string) => ACTIONS.find((a) => a.value === v)?.label ?? v;

export function AutomationsManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת אוטומציות");
    setRules((data ?? []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את האוטומציה?")) return;
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (error) return toast.error("שגיאה במחיקה");
    toast.success("האוטומציה נמחקה");
    load();
  };

  const toggleActive = async (rule: Rule) => {
    const { error } = await supabase
      .from("automation_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    if (error) return toast.error("שגיאה בעדכון");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />אוטומציות (WhatsApp / Email) ({rules.length})
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            ניתוב חכם: אם ללקוח יש WhatsApp פעיל — ההודעה תישלח לוואטסאפ. אחרת — אותה תבנית תישלח לתור המייל אוטומטית.
          </p>
        </div>
        <RuleEditDialog onSaved={load} />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <Zap className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <div className="font-medium">ניתוב חכם (Smart Routing) פעיל</div>
            <div className="text-muted-foreground">
              פעולות מסוג "שלח הודעה" בודקות את <code className="rounded bg-muted px-1">has_whatsapp</code> של הלקוח —
              TRUE → WhatsApp API · FALSE/NULL → תור המייל. אותה תבנית הודעה משמשת לשני הערוצים.
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>טריגר</TableHead>
                  <TableHead>פעולה</TableHead>
                  <TableHead>הופעלה</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{triggerLabel(r.trigger_type)}</Badge></TableCell>
                    <TableCell><Badge>{actionLabel(r.action_type)}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.run_count} פעמים
                      {r.last_run_at && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.last_run_at).toLocaleDateString("he-IL")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <RuleEditDialog rule={r} onSaved={load} />
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      אין אוטומציות עדיין. לחץ על "אוטומציה חדשה" כדי להתחיל.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleEditDialog({ rule, onSaved }: { rule?: Rule; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    trigger_type: rule?.trigger_type ?? "lead_status_changed",
    trigger_status: rule?.trigger_condition?.status ?? "converted",
    action_type: rule?.action_type ?? "send_email",
    email_subject: rule?.action_config?.subject ?? "",
    email_body: rule?.action_config?.body ?? "",
    whatsapp_message: rule?.action_config?.message ?? "",
    task_title: rule?.action_config?.title ?? "",
    is_active: rule?.is_active ?? true,
  });

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("שם האוטומציה הוא שדה חובה");

    let trigger_condition: any = {};
    if (form.trigger_type === "lead_status_changed") {
      trigger_condition = { status: form.trigger_status };
    }

    let action_config: any = {};
    if (form.action_type === "send_email") {
      if (!form.email_subject.trim() || !form.email_body.trim()) {
        return toast.error("נושא וגוף המייל הם שדות חובה");
      }
      action_config = { subject: form.email_subject, body: form.email_body };
    } else if (form.action_type === "open_whatsapp") {
      if (!form.whatsapp_message.trim()) return toast.error("הודעת וואטסאפ היא שדה חובה");
      action_config = { message: form.whatsapp_message };
    } else if (form.action_type === "create_task") {
      if (!form.task_title.trim()) return toast.error("כותרת המשימה היא שדה חובה");
      action_config = { title: form.task_title };
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      trigger_type: form.trigger_type as any,
      trigger_condition,
      action_type: form.action_type as any,
      action_config,
      is_active: form.is_active,
    };
    const { error } = rule
      ? await supabase.from("automation_rules").update(payload).eq("id", rule.id)
      : await supabase.from("automation_rules").insert(payload);
    setSaving(false);
    if (error) return toast.error("שגיאה בשמירה: " + error.message);
    toast.success(rule ? "האוטומציה עודכנה" : "האוטומציה נוצרה");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {rule ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="ml-2 h-4 w-4" />אוטומציה חדשה</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>{rule ? "עריכת אוטומציה" : "אוטומציה חדשה"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pl-1">
          <div>
            <Label>שם האוטומציה *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="למשל: שליחת מייל ברוכים הבאים" />
          </div>
          <div>
            <Label>תיאור (אופציונלי)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" />כאשר... (טריגר)
            </div>
            <div>
              <Label>סוג הטריגר</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.trigger_type === "lead_status_changed" && (
              <div>
                <Label>הסטטוס החדש הוא</Label>
                <Select value={form.trigger_status} onValueChange={(v) => setForm({ ...form, trigger_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-lg border-2 border-accent/20 bg-accent/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              ⚡ אז... (פעולה)
            </div>
            <div>
              <Label>סוג הפעולה</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.action_type === "send_email" && (
              <>
                <div>
                  <Label>נושא המייל *</Label>
                  <Input value={form.email_subject} onChange={(e) => setForm({ ...form, email_subject: e.target.value })} placeholder="ברוכים הבאים!" />
                </div>
                <div>
                  <Label>גוף המייל *</Label>
                  <Textarea
                    value={form.email_body}
                    onChange={(e) => setForm({ ...form, email_body: e.target.value })}
                    placeholder="שלום {{name}}, תודה שהצטרפת..."
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">ניתן להשתמש ב-{`{{name}}`} ו-{`{{email}}`}</p>
                </div>
              </>
            )}
            {form.action_type === "open_whatsapp" && (
              <div>
                <Label>הודעת וואטסאפ *</Label>
                <Textarea
                  value={form.whatsapp_message}
                  onChange={(e) => setForm({ ...form, whatsapp_message: e.target.value })}
                  placeholder="שלום {{name}}, רציתי ליצור איתך קשר בנוגע ל..."
                  rows={4}
                />
                <p className="mt-1 text-xs text-muted-foreground">המערכת תיצור קישור wa.me מוכן לשליחה ידנית</p>
              </div>
            )}
            {form.action_type === "create_task" && (
              <div>
                <Label>כותרת המשימה *</Label>
                <Input
                  value={form.task_title}
                  onChange={(e) => setForm({ ...form, task_title: e.target.value })}
                  placeholder="למשל: צור קשר עם {{name}}"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>פעיל</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            שמירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
