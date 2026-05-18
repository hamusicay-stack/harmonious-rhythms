import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Loader2, CalendarDays, Sparkles, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  pro_id: string;
  pro_user_id: string | null;
  event_date: string;       // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  description: string | null;
  event_type: string | null;
  is_external: boolean;
  source: string | null;
  source_ref_id: string | null;
};

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DOW = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];

function ymd(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MusicianCalendarHub() {
  const { user } = useAuth();
  const [proId, setProId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [addOpen, setAddOpen] = useState(false);
  const [addingDate, setAddingDate] = useState<string>(ymd(new Date()));
  const [form, setForm] = useState({ title: "", description: "", start_time: "", end_time: "", event_type: "private" });
  const [saving, setSaving] = useState(false);

  // Locate the music_pro row owned by the current user
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("music_pros").select("id").eq("user_id", user.id).maybeSingle();
      setProId(data?.id ?? null);
    })();
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const { data, error } = await supabase
      .from("music_pro_calendar_events" as never)
      .select("*")
      .eq("pro_user_id", user.id)
      .gte("event_date", ymd(monthStart))
      .lte("event_date", ymd(monthEnd))
      .order("event_date", { ascending: true });
    if (error) toast.error(friendlyError(error));
    setEvents(((data ?? []) as unknown) as CalendarEvent[]);
    setLoading(false);
  };

  useEffect(() => { loadEvents(); /* eslint-disable-next-line */ }, [user, cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.event_date) ?? [];
      arr.push(e);
      m.set(e.event_date, arr);
    }
    return m;
  }, [events]);

  // Build month grid (RTL: week starts Sunday on the right visually because dir=rtl flips the grid)
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay(); // 0..6 (Sun..Sat)
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      cells.push({ date: dt, key: ymd(dt) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `tail-${cells.length}` });
    return cells;
  }, [cursor]);

  const openAddDialog = (dateStr: string) => {
    setAddingDate(dateStr);
    setForm({ title: "", description: "", start_time: "", end_time: "", event_type: "private" });
    setAddOpen(true);
  };

  const saveManualEvent = async () => {
    if (!user || !proId) { toast.error("יש להגדיר פרופיל מוזיקאי תחילה"); return; }
    if (!form.title.trim()) { toast.error("הזן כותרת לאירוע"); return; }
    setSaving(true);
    const payload = {
      pro_id: proId,
      pro_user_id: user.id,
      event_date: addingDate,
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      event_type: form.event_type,
      is_external: true,
      source: "manual",
    };
    // Calendar table is new — supabase generated types lag behind
    const { error } = await (supabase.from("music_pro_calendar_events" as never) as unknown as {
      insert: (p: typeof payload) => Promise<{ error: { message: string } | null }>;
    }).insert(payload);
    setSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("האירוע נוסף ליומן הפרטי שלך");
    setAddOpen(false);
    loadEvents();
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("music_pro_calendar_events" as never).delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("האירוע הוסר");
    loadEvents();
  };

  const today = ymd(new Date());
  const monthLabel = `${HE_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const siteCount = events.filter((e) => !e.is_external).length;
  const extCount = events.filter((e) => e.is_external).length;

  if (!user) {
    return (
      <div dir="rtl" className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        יש להתחבר כדי לצפות ביומן
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-l from-amber-500/[0.08] via-background/30 to-background/80 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 ring-1 ring-amber-400/40">
              <CalendarDays className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold leading-tight">📅 יומן אירועים</h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> פרטי — רק את/ה רואה את היומן הזה
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center font-semibold">{monthLabel}</div>
            <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>
              היום
            </Button>
            <Button size="sm" onClick={() => openAddDialog(today)} className="bg-gradient-to-br from-amber-400 to-amber-600 text-black hover:brightness-110">
              <Plus className="ml-1 h-4 w-4" /> הוסף אירוע ידני
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-amber-200">
            <Sparkles className="h-3 w-3" /> אירועי אתר · {siteCount}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/10 px-2.5 py-1 text-slate-200">
            <Lock className="h-3 w-3" /> אירועים פרטיים · {extCount}
          </span>
          {loading && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> טוען…</span>}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4 backdrop-blur">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-2">
          {HE_DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((cell) => {
            if (!cell.date) return <div key={cell.key} className="aspect-square rounded-lg bg-muted/10" />;
            const key = ymd(cell.date);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <button
                key={cell.key}
                onClick={() => openAddDialog(key)}
                className={cn(
                  "group relative aspect-square rounded-lg border p-1.5 text-right transition-all overflow-hidden",
                  "bg-gradient-to-br from-background/60 to-background/30",
                  isToday ? "border-amber-400/60 ring-1 ring-amber-400/40" : "border-border/50 hover:border-border",
                  dayEvents.length > 0 && "shadow-sm",
                )}
                title="לחיצה תוסיף אירוע ידני"
              >
                <div className={cn("text-[11px] font-semibold leading-none", isToday ? "text-amber-300" : "text-foreground/80")}>
                  {cell.date.getDate()}
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight",
                        e.is_external
                          ? "bg-slate-500/25 text-slate-100 ring-1 ring-slate-400/30"
                          : "bg-gradient-to-l from-amber-400/40 to-amber-500/20 text-amber-50 ring-1 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.25)]",
                      )}
                    >
                      {e.title ?? "אירוע"}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of events this month */}
      <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4 backdrop-blur">
        <h3 className="mb-2 text-sm font-semibold">אירועים החודש</h3>
        {events.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">אין אירועים החודש. לחץ על תאריך כדי להוסיף.</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-xl border p-2.5",
                  e.is_external
                    ? "border-slate-400/30 bg-slate-500/5"
                    : "border-amber-400/40 bg-gradient-to-l from-amber-500/10 to-transparent",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-block h-2 w-2 rounded-full", e.is_external ? "bg-slate-400" : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]")} />
                    <span className="font-semibold text-sm truncate">{e.title ?? "אירוע"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(e.event_date).toLocaleDateString("he-IL")}
                      {e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}
                      {e.end_time ? `–${e.end_time.slice(0, 5)}` : ""}
                    </span>
                  </div>
                  {e.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{e.description}</p>}
                  <div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">
                    {e.is_external ? "אירוע פרטי / חיצוני" : "הופעה דרך האתר"}
                  </div>
                </div>
                {e.is_external && (
                  <Button size="icon" variant="ghost" onClick={() => deleteEvent(e.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add manual event dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => !saving && setAddOpen(v)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">הוספת אירוע ידני · {new Date(addingDate).toLocaleDateString("he-IL")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-right">
            <div className="space-y-1.5">
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="חתונה פרטית / חזרה / לא זמין" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>משעה</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>עד שעה</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>תיאור / הערות</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="פרטים פנימיים בלבד" />
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-200/90">
              🔒 פרטי לחלוטין — לקוחות לא רואים את האירוע הזה. ישמש אותך לבדיקת חפיפות בלבד.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>ביטול</Button>
            <Button onClick={saveManualEvent} disabled={saving} className="bg-gradient-to-br from-amber-400 to-amber-600 text-black hover:brightness-110">
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
              שמור ביומן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
