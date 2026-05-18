import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, Search, ArrowRight, ShoppingBag, Music2, MessageCircle, ExternalLink, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ContextType = "MARKETPLACE" | "PRO_INQUIRY" | "DIRECT_MESSAGE";

type UnifiedThread = {
  key: string; // contextType:id
  id: string;
  contextType: ContextType;
  otherUserId: string;
  otherProfile: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  lastMessageAt: string;
  lastPreview: string | null;
  unread: number;
  contextLabel: string | null;
  contextLink: string | null;
};

type Message = { id: string; sender_id: string; body: string; created_at: string };

const CTX_META: Record<ContextType, { label: string; className: string; icon: typeof ShoppingBag }> = {
  MARKETPLACE: { label: "יד שנייה", className: "bg-amber-500/20 text-amber-300 border-amber-500/40", icon: ShoppingBag },
  PRO_INQUIRY: { label: "אינדקס מקצוענים", className: "bg-blue-500/20 text-blue-300 border-blue-500/40", icon: Music2 },
  DIRECT_MESSAGE: { label: "הודעה פרטית", className: "bg-primary/20 text-primary border-primary/40", icon: MessageCircle },
};

export function CentralChatHub() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<UnifiedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => threads.find((t) => t.key === activeKey) ?? null, [threads, activeKey]);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [mkt, pro, dm] = await Promise.all([
      supabase.from("marketplace_chat_threads")
        .select("id, buyer_id, seller_id, last_message_at, last_message_preview, buyer_unread, seller_unread, listing_id, listing:marketplace_listings(id, title)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false }).limit(100),
      supabase.from("pro_chat_threads")
        .select("id, sender_id, pro_user_id, pro_id, last_message_at, last_message_preview, sender_unread, pro_unread, pro:music_pros(id, display_name)")
        .or(`sender_id.eq.${user.id},pro_user_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false }).limit(100),
      supabase.from("forum_dm_threads")
        .select("id, user_a, user_b, last_message_at, last_message_preview, unread_a, unread_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false }).limit(100),
    ]);

    const otherIds = new Set<string>();
    const raw: UnifiedThread[] = [];

    (mkt.data ?? []).forEach((t: any) => {
      const other = t.buyer_id === user.id ? t.seller_id : t.buyer_id;
      otherIds.add(other);
      raw.push({
        key: `MARKETPLACE:${t.id}`, id: t.id, contextType: "MARKETPLACE",
        otherUserId: other, otherProfile: null,
        lastMessageAt: t.last_message_at, lastPreview: t.last_message_preview,
        unread: t.buyer_id === user.id ? t.buyer_unread : t.seller_unread,
        contextLabel: t.listing?.title ? `לצפייה במודעה: ${t.listing.title}` : "מודעת יד שנייה",
        contextLink: `/marketplace/${t.listing_id}`,
      });
    });
    (pro.data ?? []).forEach((t: any) => {
      const other = t.sender_id === user.id ? t.pro_user_id : t.sender_id;
      otherIds.add(other);
      raw.push({
        key: `PRO_INQUIRY:${t.id}`, id: t.id, contextType: "PRO_INQUIRY",
        otherUserId: other, otherProfile: null,
        lastMessageAt: t.last_message_at, lastPreview: t.last_message_preview,
        unread: t.sender_id === user.id ? t.sender_unread : t.pro_unread,
        contextLabel: t.pro?.display_name ? `פרופיל מקצועי: ${t.pro.display_name}` : "אינדקס מקצוענים",
        contextLink: `/pros/${t.pro_id}`,
      });
    });
    (dm.data ?? []).forEach((t: any) => {
      const other = t.user_a === user.id ? t.user_b : t.user_a;
      otherIds.add(other);
      raw.push({
        key: `DIRECT_MESSAGE:${t.id}`, id: t.id, contextType: "DIRECT_MESSAGE",
        otherUserId: other, otherProfile: null,
        lastMessageAt: t.last_message_at, lastPreview: t.last_message_preview,
        unread: t.user_a === user.id ? t.unread_a : t.unread_b,
        contextLabel: null, contextLink: null,
      });
    });

    const profMap = new Map<string, UnifiedThread["otherProfile"]>();
    if (otherIds.size) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", Array.from(otherIds));
      (profs ?? []).forEach((p: any) => profMap.set(p.id, { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url }));
    }
    raw.forEach((t) => { t.otherProfile = profMap.get(t.otherUserId) ?? null; });
    raw.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setThreads(raw);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Realtime: refresh thread list on any new message
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`central-chat-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_chat_messages" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pro_chat_messages" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_direct_messages" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadThreads]);

  // Load messages for active thread
  useEffect(() => {
    if (!active) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      setMsgLoading(true);
      let data: Message[] = [];
      if (active.contextType === "MARKETPLACE") {
        const r = await supabase.from("marketplace_chat_messages")
          .select("id, sender_id, body, created_at").eq("thread_id", active.id).order("created_at");
        data = (r.data as Message[]) ?? [];
      } else if (active.contextType === "PRO_INQUIRY") {
        const r = await supabase.from("pro_chat_messages")
          .select("id, sender_id, body, created_at").eq("thread_id", active.id).order("created_at");
        data = (r.data as Message[]) ?? [];
      } else {
        const r = await supabase.from("forum_direct_messages")
          .select("id, sender_id, body, created_at").eq("thread_id", active.id).order("created_at");
        data = (r.data as Message[]) ?? [];
      }
      if (cancelled) return;
      setMessages(data);
      setMsgLoading(false);
      // mark unread = 0
      if (user) {
        if (active.contextType === "MARKETPLACE") {
          const t = await supabase.from("marketplace_chat_threads").select("buyer_id").eq("id", active.id).maybeSingle();
          const patch = t.data?.buyer_id === user.id ? { buyer_unread: 0 } : { seller_unread: 0 };
          await supabase.from("marketplace_chat_threads").update(patch).eq("id", active.id);
        } else if (active.contextType === "PRO_INQUIRY") {
          const t = await supabase.from("pro_chat_threads").select("sender_id").eq("id", active.id).maybeSingle();
          const patch = t.data?.sender_id === user.id ? { sender_unread: 0 } : { pro_unread: 0 };
          await supabase.from("pro_chat_threads").update(patch).eq("id", active.id);
        } else {
          const t = await supabase.from("forum_dm_threads").select("user_a").eq("id", active.id).maybeSingle();
          const patch = t.data?.user_a === user.id ? { unread_a: 0 } : { unread_b: 0 };
          await supabase.from("forum_dm_threads").update(patch).eq("id", active.id);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [active?.key]); // eslint-disable-line

  // Realtime per-thread messages
  useEffect(() => {
    if (!active) return;
    const table =
      active.contextType === "MARKETPLACE" ? "marketplace_chat_messages" :
      active.contextType === "PRO_INQUIRY" ? "pro_chat_messages" : "forum_direct_messages";
    const ch = supabase.channel(`thread-${active.key}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `thread_id=eq.${active.id}` },
        (p) => setMessages((m) => [...m, p.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.key]); // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) =>
      (t.otherProfile?.display_name ?? "").toLowerCase().includes(q) ||
      (t.otherProfile?.username ?? "").toLowerCase().includes(q) ||
      (t.lastPreview ?? "").toLowerCase().includes(q),
    );
  }, [threads, search]);

  const send = async () => {
    if (!active || !user || draft.trim().length < 1 || sending) return;
    setSending(true);
    try {
      if (active.contextType === "MARKETPLACE") {
        const { error } = await supabase.from("marketplace_chat_messages")
          .insert({ thread_id: active.id, sender_id: user.id, body: draft.trim() });
        if (error) throw error;
      } else if (active.contextType === "PRO_INQUIRY") {
        const { error } = await supabase.from("pro_chat_messages")
          .insert({ thread_id: active.id, sender_id: user.id, body: draft.trim() });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_direct_messages")
          .insert({ thread_id: active.id, sender_id: user.id, body: draft.trim() });
        if (error) throw error;
      }
      setDraft("");
    } catch (e) {
      toast.error((e as Error).message || "שגיאה בשליחת ההודעה");
    } finally {
      setSending(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-muted-foreground">יש להתחבר כדי לראות הודעות</div>;

  return (
    <div dir="rtl" className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-background backdrop-blur-xl shadow-2xl">
      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-80 lg:w-96 shrink-0 border-l border-border/60 flex flex-col bg-card/30 backdrop-blur",
        active && "hidden md:flex",
      )}>
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש שיחות..." className="pr-9 bg-background/60" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">אין שיחות עדיין</div>
          )}
          {filtered.map((t) => {
            const meta = CTX_META[t.contextType];
            const Icon = meta.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={cn(
                  "w-full text-right px-3 py-3 border-b border-border/40 hover:bg-accent/40 transition-colors flex gap-3 items-start",
                  activeKey === t.key && "bg-primary/10 border-r-2 border-r-primary",
                )}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={t.otherProfile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(t.otherProfile?.display_name ?? "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{t.otherProfile?.display_name ?? t.otherProfile?.username ?? "משתמש"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: false, locale: he })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 gap-1", meta.className)}>
                      <Icon className="h-2.5 w-2.5" />{meta.label}
                    </Badge>
                    {t.unread > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">{t.unread}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{t.lastPreview ?? "—"}</p>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </aside>

      {/* Main */}
      <main className={cn("flex-1 flex flex-col", !active && "hidden md:flex")}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p>בחר שיחה כדי להתחיל</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-3 border-b border-border/60 bg-card/40 backdrop-blur flex items-center gap-3">
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveKey(null)}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={active.otherProfile?.avatar_url ?? undefined} />
                <AvatarFallback>{(active.otherProfile?.display_name ?? "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{active.otherProfile?.display_name ?? "משתמש"}</div>
                {active.contextLink && active.contextLabel && (
                  <Link to={active.contextLink} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />{active.contextLabel}
                  </Link>
                )}
              </div>
              <Badge variant="outline" className={cn("hidden sm:inline-flex", CTX_META[active.contextType].className)}>
                {CTX_META[active.contextType].label}
              </Badge>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-background/40 to-background/80">
              {msgLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!msgLoading && messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">אין הודעות בשיחה — שלח את ההודעה הראשונה</p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm",
                      mine
                        ? "bg-gradient-to-br from-primary to-amber-500/90 text-primary-foreground rounded-bl-md"
                        : "bg-muted/80 text-foreground rounded-br-md border border-border/40",
                    )}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{m.body}</p>
                      <p className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "text-left")}>
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: he })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/60 bg-card/40 backdrop-blur flex gap-2 items-end">
              <Button size="icon" variant="ghost" disabled title="קבצים — בקרוב">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="כתוב הודעה..."
                rows={1}
                maxLength={2000}
                className="resize-none min-h-[40px] max-h-32 bg-background/60"
              />
              <Button onClick={send} disabled={sending || !draft.trim()} className="gap-1">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                שלח
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
