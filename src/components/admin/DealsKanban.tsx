import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Plus, Loader2, GripVertical, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DealStatus = "new_lead" | "contacted" | "quote_sent" | "closed_won";

type Deal = {
  id: string;
  customer_name: string;
  value: number;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  title: string | null;
  source_type: string | null;
  source_ref_id: string | null;
  customer_id: string | null;
};

const COLUMNS: { id: DealStatus; title: string; tone: string }[] = [
  { id: "new_lead", title: "ליד חדש", tone: "border-blue-500/40 bg-blue-500/5" },
  { id: "contacted", title: "נוצר קשר", tone: "border-amber-500/40 bg-amber-500/5" },
  { id: "quote_sent", title: "נשלחה הצעה", tone: "border-purple-500/40 bg-purple-500/5" },
  { id: "closed_won", title: "הושלם", tone: "border-emerald-500/40 bg-emerald-500/5" },
];

function formatILS(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="גרור"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold">{deal.title || deal.customer_name}</div>
          {deal.title && <div className="text-xs text-muted-foreground">{deal.customer_name}</div>}
          <div className="text-sm font-bold text-primary">{formatILS(Number(deal.value || 0))}</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {new Date(deal.created_at).toLocaleDateString("he-IL")}
            </div>
            {deal.source_type === "music_pro_inquiry" && (
              <Badge variant="outline" className="gap-1 border-purple-500/40 bg-purple-500/10 text-[10px] text-purple-600">
                <Music2 className="h-3 w-3" />פנייה למוזיקאי
              </Badge>
            )}
          </div>
          {deal.notes && (
            <div className="line-clamp-2 text-xs text-muted-foreground">{deal.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({
  status, title, tone, deals,
}: { status: DealStatus; title: string; tone: string; deals: Deal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = deals.reduce((s, d) => s + Number(d.value || 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col gap-2 rounded-xl border-2 p-3 transition-colors",
        tone,
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">
          {deals.length} • {formatILS(total)}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
        {deals.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            גרור לכאן
          </div>
        )}
      </div>
    </div>
  );
}

export function DealsKanban() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", value: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("deals")
        .select("id,customer_name,value,status,notes,created_at")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("שגיאה בטעינת עסקאות");
      } else {
        setDeals((data || []) as Deal[]);
      }
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<DealStatus, Deal[]> = { new_lead: [], contacted: [], quote_sent: [], closed_won: [] };
    deals.forEach((d) => g[d.status]?.push(d));
    return g;
  }, [deals]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as DealStatus;
    const deal = deals.find((d) => d.id === active.id);
    if (!deal || deal.status === newStatus) return;
    const prev = deals;
    setDeals((d) => d.map((x) => (x.id === deal.id ? { ...x, status: newStatus } : x)));
    const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", deal.id);
    if (error) {
      setDeals(prev);
      toast.error("שגיאה בעדכון העסקה");
    } else {
      toast.success("העסקה עודכנה");
    }
  };

  const createDeal = async () => {
    if (!form.customer_name.trim()) { toast.error("שם לקוח חובה"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("deals")
      .insert({
        customer_name: form.customer_name.trim(),
        value: Number(form.value) || 0,
        notes: form.notes.trim() || null,
      })
      .select("id,customer_name,value,status,notes,created_at")
      .single();
    setSaving(false);
    if (error) { toast.error("שגיאה ביצירת עסקה"); return; }
    setDeals((d) => [data as Deal, ...d]);
    setForm({ customer_name: "", value: "", notes: "" });
    setOpen(false);
    toast.success("עסקה נוצרה");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">צינור עסקאות</h2>
          <p className="text-xs text-muted-foreground">גרור כרטיסים בין עמודות לעדכון סטטוס</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="ml-1 h-4 w-4" />עסקה חדשה</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>עסקה חדשה</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>שם לקוח</Label>
                <Input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div>
                <Label>שווי משוער (₪)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createDeal} disabled={saving}>
                {saving && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((c) => (
            <Column key={c.id} status={c.id} title={c.title} tone={c.tone} deals={grouped[c.id]} />
          ))}
        </div>
      </DndContext>
    </Card>
  );
}
