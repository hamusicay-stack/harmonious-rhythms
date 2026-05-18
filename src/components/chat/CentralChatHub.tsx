import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Loader2, Search, ArrowRight, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./shared/ChatBubble";
import { ChatInput } from "./shared/ChatInput";
import {
  ConversationListItem,
  CTX_META,
  type ContextType,
  type ConversationThread,
} from "./shared/ConversationListItem";

type Source = "core" | "marketplace" | "pro";

type Thread = ConversationThread & {
  source: Source;
  otherUserId: string;
  iAmUserA: boolean; // for "core" only — which side am I
  // for marketplace/pro we also need context info
  rawListingId?: string;
  rawProId?: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

const MSG_TABLE: Record<Source, "core_chat_messages" | "marketplace_chat_messages" | "pro_chat_messages"> = {
  core: "core_chat_messages",
  marketplace: "marketplace_chat_messages",
  pro: "pro_chat_messages",
};

const THREAD_TABLE: Record<Source, "core_chat_threads" | "marketplace_chat_threads" | "pro_chat_threads"> = {
  core: "core_chat_threads",
  marketplace: "marketplace_chat_threads",
  pro: "pro_chat_threads",
};

export function CentralChatHub() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [coreRes, mkRes, proRes] = await Promise.all([
      supabase
        .from("core_chat_threads")
        .select(
          "id, context_type, context_id, user_a, user_b, last_message_at, last_message_preview, unread_a, unread_b",
        )
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(100),
      supabase
        .from("marketplace_chat_threads")
        .select(
          "id, listing_id, buyer_id, seller_id, last_message_at, last_message_preview, buyer_unread, seller_unread",
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(100),
      supabase
        .from("pro_chat_threads")
        .select(
          "id, pro_id, sender_id, pro_user_id, last_message_at, last_message_preview, sender_unread, pro_unread",
        )
        .or(`sender_id.eq.${user.id},pro_user_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(100),
    ]);

    if (coreRes.error) console.error("core threads", coreRes.error);
    if (mkRes.error) console.error("marketplace threads", mkRes.error);
    if (proRes.error) console.error("pro threads", proRes.error);

    const list: Thread[] = [];
    const allOtherIds = new Set<string>();

    (coreRes.data ?? []).forEach((t: any) => {
      const iAmUserA = t.user_a === user.id;
      const otherUserId = iAmUserA ? t.user_b : t.user_a;
      allOtherIds.add(otherUserId);
      list.push({
        id: `core:${t.id}`,
        source: "core",
        contextType: (t.context_type as ContextType) ?? "DIRECT",
        otherUserId,
        iAmUserA,
        otherProfile: null,
        lastMessageAt: t.last_message_at,
        lastPreview: t.last_message_preview,
        unread: iAmUserA ? t.unread_a : t.unread_b,
      });
    });

    (mkRes.data ?? []).forEach((t: any) => {
      const iAmBuyer = t.buyer_id === user.id;
      const otherUserId = iAmBuyer ? t.seller_id : t.buyer_id;
      allOtherIds.add(otherUserId);
      list.push({
        id: `marketplace:${t.id}`,
        source: "marketplace",
        contextType: "MARKETPLACE",
        otherUserId,
        iAmUserA: iAmBuyer,
        otherProfile: null,
        lastMessageAt: t.last_message_at ?? new Date(0).toISOString(),
        lastPreview: t.last_message_preview,
        unread: iAmBuyer ? (t.buyer_unread ?? 0) : (t.seller_unread ?? 0),
        rawListingId: t.listing_id,
      });
    });

    (proRes.data ?? []).forEach((t: any) => {
      const iAmSender = t.sender_id === user.id;
      const otherUserId = iAmSender ? t.pro_user_id : t.sender_id;
      allOtherIds.add(otherUserId);
      list.push({
        id: `pro:${t.id}`,
        source: "pro",
        contextType: "PRO",
        otherUserId,
        iAmUserA: iAmSender,
        otherProfile: null,
        lastMessageAt: t.last_message_at ?? new Date(0).toISOString(),
        lastPreview: t.last_message_preview,
        unread: iAmSender ? (t.sender_unread ?? 0) : (t.pro_unread ?? 0),
        rawProId: t.pro_id,
      });
    });

    // Hydrate other-party profiles
    if (allOtherIds.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", Array.from(allOtherIds));
      const profMap = new Map<string, ConversationThread["otherProfile"]>();
      (profs ?? []).forEach((p: any) =>
        profMap.set(p.id, {
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
        }),
      );
      list.forEach((t) => {
        t.otherProfile = profMap.get(t.otherUserId) ?? null;
      });
    }

    list.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );

    setThreads(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Honor ?thread=core:<id> from the URL so deep-links open the right chat.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const wanted = sp.get("thread");
    if (!wanted) return;
    const match = threads.find((t) => t.id === wanted);
    if (match) setActiveId(match.id);
  }, [threads]);

  // Realtime: refresh list on any thread/message change for the three sources
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`hub-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "core_chat_threads" }, () => loadThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_chat_threads" }, () => loadThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "pro_chat_threads" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "core_chat_messages" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_chat_messages" }, () => loadThreads())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pro_chat_messages" }, () => loadThreads())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadThreads]);

  // Load messages for active thread + mark read
  useEffect(() => {
    if (!active || !user) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const [, rawId] = active.id.split(":");
    (async () => {
      setMsgLoading(true);
      const { data, error } = await supabase
        .from(MSG_TABLE[active.source])
        .select("id, sender_id, body, created_at")
        .eq("thread_id", rawId)
        .order("created_at");
      if (cancelled) return;
      if (error) {
        console.error("load messages", error);
        toast.error(error.message);
      }
      setMessages((data as Message[]) ?? []);
      setMsgLoading(false);

      // Mark thread read for this side
      let patch: Record<string, number> | null = null;
      if (active.source === "core") {
        patch = active.iAmUserA ? { unread_a: 0 } : { unread_b: 0 };
      } else if (active.source === "marketplace") {
        patch = active.iAmUserA ? { buyer_unread: 0 } : { seller_unread: 0 };
      } else if (active.source === "pro") {
        patch = active.iAmUserA ? { sender_unread: 0 } : { pro_unread: 0 };
      }
      if (patch) {
        await supabase.from(THREAD_TABLE[active.source]).update(patch as any).eq("id", rawId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.id]); // eslint-disable-line

  // Realtime per-thread INSERT
  useEffect(() => {
    if (!active) return;
    const [, rawId] = active.id.split(":");
    const ch = supabase
      .channel(`hub-thread-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: MSG_TABLE[active.source],
          filter: `thread_id=eq.${rawId}`,
        },
        (p) =>
          setMessages((m) => {
            const next = p.new as Message;
            if (m.some((x) => x.id === next.id)) return m;
            return [...m, next];
          }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [active?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        (t.otherProfile?.display_name ?? "").toLowerCase().includes(q) ||
        (t.otherProfile?.username ?? "").toLowerCase().includes(q) ||
        (t.lastPreview ?? "").toLowerCase().includes(q),
    );
  }, [threads, search]);

  const send = async (text: string) => {
    if (!active || !user) return;
    const [, rawId] = active.id.split(":");
    const { error } = await supabase.from(MSG_TABLE[active.source]).insert({
      thread_id: rawId,
      sender_id: user.id,
      body: text,
    });
    if (error) {
      console.error("send", error);
      throw new Error(error.message);
    }
  };

  if (!user)
    return (
      <div className="p-8 text-center text-muted-foreground">
        יש להתחבר כדי לראות הודעות
      </div>
    );

  return (
    <div
      className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-background backdrop-blur-xl shadow-2xl"
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "w-full md:w-80 lg:w-96 shrink-0 border-l border-border/60 flex flex-col bg-card/30 backdrop-blur",
          active && "hidden md:flex",
        )}
      >
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש שיחות..."
              className="pr-9 bg-background/60"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              אין שיחות עדיין
            </div>
          )}
          {filtered.map((t) => (
            <ConversationListItem
              key={t.id}
              thread={t}
              active={activeId === t.id}
              onClick={() => setActiveId(t.id)}
            />
          ))}
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
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden"
                onClick={() => setActiveId(null)}
                aria-label="חזור"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={active.otherProfile?.avatar_url ?? undefined}
                />
                <AvatarFallback>
                  {(active.otherProfile?.display_name ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {active.otherProfile?.display_name ?? "משתמש"}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "hidden sm:inline-flex",
                  CTX_META[active.contextType].className,
                )}
              >
                {CTX_META[active.contextType].label}
              </Badge>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-background/40 to-background/80"
            >
              {msgLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {!msgLoading && messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  אין הודעות בשיחה — שלח את ההודעה הראשונה
                </p>
              )}
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  isOwn={m.sender_id === user.id}
                />
              ))}
            </div>

            <ChatInput onSend={send} />
          </>
        )}
      </main>
    </div>
  );
}
