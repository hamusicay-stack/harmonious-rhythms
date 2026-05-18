import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

type InquiryStatus = "new" | "in_progress" | "completed" | "cancelled";

type Props = {
  /** music_pros.id used as the thread's context_id when context_type === 'PRO' */
  proId: string;
  /** the OTHER side of the chat — the client who sent the inquiry */
  clientUserId: string;
  /** disable when used by the client side */
  enabled: boolean;
};

const OPTIONS: { value: InquiryStatus; emoji: string; label: string; tone: string; glow: string }[] = [
  { value: "new",         emoji: "⚪", label: "חדש",           tone: "from-slate-500/20 to-slate-500/5 text-slate-200 border-slate-400/40",   glow: "shadow-[0_0_24px_rgba(148,163,184,0.45)]" },
  { value: "in_progress", emoji: "🔵", label: "בטיפול",         tone: "from-sky-500/25 to-sky-500/5 text-sky-200 border-sky-400/40",         glow: "shadow-[0_0_24px_rgba(56,189,248,0.55)]" },
  { value: "completed",   emoji: "🟢", label: "הושלם ונסגר",   tone: "from-emerald-500/25 to-emerald-500/5 text-emerald-200 border-emerald-400/40", glow: "shadow-[0_0_24px_rgba(16,185,129,0.55)]" },
  { value: "cancelled",   emoji: "🔴", label: "לא רלוונטי",    tone: "from-rose-500/25 to-rose-500/5 text-rose-200 border-rose-400/40",       glow: "shadow-[0_0_24px_rgba(244,63,94,0.5)]" },
];

export function ProChatStatusToolbar({ proId, clientUserId, enabled }: Props) {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [ownerChecked, setOwnerChecked] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [status, setStatus] = useState<InquiryStatus | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ title: string | null; start_time: string | null; end_time: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<InquiryStatus | null>(null);

  // Verify the current user actually owns this music_pros row (only the pro sees the toolbar)
  useEffect(() => {
    if (!enabled || !user || !proId) { setIsOwner(false); setOwnerChecked(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("music_pros")
        .select("user_id")
        .eq("id", proId)
        .maybeSingle();
      if (cancelled) return;
      setIsOwner(!!data && data.user_id === user.id);
      setOwnerChecked(true);
    })();
    return () => { cancelled = true; };
  }, [enabled, user, proId]);

  // Load the most recent inquiry between this client and pro
  useEffect(() => {
    if (!enabled || !isOwner) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("music_pro_inquiries")
        .select("id, status, event_date")
        .eq("pro_id", proId)
        .eq("sender_id", clientUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("inquiry lookup", error);
      setInquiryId(data?.id ?? null);
      setStatus((data?.status as InquiryStatus) ?? null);
      setEventDate((data?.event_date as string | null) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [proId, clientUserId, enabled, isOwner]);

  // Realtime: keep the active status synced if updated elsewhere (admin etc.)
  useEffect(() => {
    if (!inquiryId) return;
    const ch = supabase
      .channel(`inq-${inquiryId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "music_pro_inquiries", filter: `id=eq.${inquiryId}` },
        (p) => setStatus(((p.new as { status: InquiryStatus }).status) ?? null),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [inquiryId]);

  // PRIVATE conflict check — runs ONLY for the owning pro. Client never sees this.
  useEffect(() => {
    if (!isOwner || !eventDate || !proId) { setConflict(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("music_pro_calendar_events" as never)
        .select("title, start_time, end_time, source_ref_id")
        .eq("pro_id", proId)
        .eq("event_date", eventDate)
        .limit(5);
      if (cancelled) return;
      if (error) { console.error("calendar conflict lookup", error); setConflict(null); return; }
      const rows = (data ?? []) as Array<{ title: string | null; start_time: string | null; end_time: string | null; source_ref_id: string | null }>;
      // ignore an entry that points back to this same inquiry (avoid self-conflict)
      const real = rows.find((r) => r.source_ref_id !== inquiryId);
      setConflict(real ? { title: real.title, start_time: real.start_time, end_time: real.end_time } : null);
    })();
    return () => { cancelled = true; };
  }, [isOwner, eventDate, proId, inquiryId]);

  if (!enabled || !ownerChecked || !isOwner) return null;
  if (!loading && !inquiryId) return null;

  const setNewStatus = async (next: InquiryStatus) => {
    if (!inquiryId || saving || next === status) return;
    setSaving(next);
    const prev = status;
    setStatus(next); // optimistic
    const { error } = await supabase.rpc("update_pro_inquiry_and_crm_status", {
      p_inquiry_id: inquiryId,
      p_new_status: next,
    });
    setSaving(null);
    if (error) {
      setStatus(prev);
      toast.error(friendlyError(error));
      return;
    }
    toast.success("הסטטוס עודכן וסונכרן ל‑CRM");
  };

  return (
    <div
      dir="rtl"
      className="border-b border-amber-500/20 bg-gradient-to-l from-amber-500/[0.04] via-background/40 to-background/80 backdrop-blur-md px-3 py-2.5"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">
          ניהול פנייה · Pro CRM
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((opt) => {
          const isActive = status === opt.value;
          const isSaving = saving === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setNewStatus(opt.value)}
              disabled={!!saving || loading}
              className={cn(
                "group relative flex-1 min-w-[88px] rounded-xl border px-2.5 py-1.5 text-xs font-medium",
                "transition-all duration-300 ease-out",
                "bg-gradient-to-b",
                opt.tone,
                isActive
                  ? cn("border-opacity-100 scale-[1.02]", opt.glow)
                  : "border-border/40 hover:border-border opacity-70 hover:opacity-100 hover:scale-[1.01]",
                saving && !isActive && "opacity-40",
              )}
              aria-pressed={isActive}
            >
              {isActive && (
                <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/5 animate-pulse" />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="text-sm leading-none">{opt.emoji}</span>
                )}
                <span className="leading-none">{opt.label}</span>
              </span>
              {isActive && (
                <span
                  className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
