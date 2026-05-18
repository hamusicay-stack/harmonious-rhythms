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

type Thread = ConversationThread & {
  otherUserId: string;
  iAmUserA: boolean;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
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

    const { data, error } = await supabase
      .from("core_chat_threads")
      .select(
        "id, context_type, context_id, user_a, user_b, last_message_at, last_message_preview, unread_a, unread_b",
      )
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as any[];
    const otherIds = Array.from(
      new Set(rows.map((t) => (t.user_a === user.id ? t.user_b : t.user_a))),
    );

    const profMap = new Map<string, Thread["otherProfile"]>();
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", otherIds);
      (profs ?? []).forEach((p: any) =>
        profMap.set(p.id, {
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
        }),
      );
    }

    const list: Thread[] = rows.map((t) => {
      const iAmUserA = t.user_a === user.id;
      const otherUserId = iAmUserA ? t.user_b : t.user_a;
      return {
        id: t.id,
        contextType: t.context_type as ContextType,
        otherUserId,
        iAmUserA,
        otherProfile: profMap.get(otherUserId) ?? null,
        lastMessageAt: t.last_message_at,
        lastPreview: t.last_message_preview,
        unread: iAmUserA ? t.unread_a : t.unread_b,
      };
    });

    setThreads(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Realtime: refresh on new messages or thread updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`core-chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "core_chat_threads" },
        () => loadThreads(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "core_chat_messages" },
        () => loadThreads(),
      )
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
    (async () => {
      setMsgLoading(true);
      const { data } = await supabase
        .from("core_chat_messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("thread_id", active.id)
        .order("created_at");
      if (cancelled) return;
      setMessages((data as Message[]) ?? []);
      setMsgLoading(false);

      // Reset unread counter for this side
      const patch = active.iAmUserA ? { unread_a: 0 } : { unread_b: 0 };
      await supabase
        .from("core_chat_threads")
        .update(patch)
        .eq("id", active.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.id]); // eslint-disable-line

  // Realtime per-thread
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`core-thread-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "core_chat_messages",
          filter: `thread_id=eq.${active.id}`,
        },
        (p) => setMessages((m) => [...m, p.new as Message]),
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
    const { error } = await supabase.from("core_chat_messages").insert({
      thread_id: active.id,
      sender_id: user.id,
      body: text,
    });
    if (error) throw new Error(error.message);
  };

  if (!user)
    return (
      <div className="p-8 text-center text-muted-foreground">
        יש להתחבר כדי לראות הודעות
      </div>
    );

  return (
    <div
      dir="rtl"
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
