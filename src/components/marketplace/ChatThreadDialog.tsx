import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle, MoreVertical, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DealConfirmationPrompt } from "./DealConfirmationPrompt";

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

interface Props {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  trigger?: React.ReactNode;
}

// Anti-spam: max 5 messages within a rolling 30s window
const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 30_000;

export function ChatThreadDialog({ listingId, sellerId, listingTitle, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendTimes, setSendTimes] = useState<number[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBuyer = user && user.id !== sellerId;
  // Other party = seller (buyer's POV is what this dialog handles)
  const otherUserId = sellerId;

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const buyerId = user.id === sellerId ? null : user.id;
      if (!buyerId) {
        setLoading(false);
        return;
      }
      // Find or create thread
      let { data: thread } = await supabase
        .from("marketplace_chat_threads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", buyerId)
        .maybeSingle();
      if (!thread) {
        const { data: created, error } = await supabase
          .from("marketplace_chat_threads")
          .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
          .select("id")
          .single();
        if (error) {
          toast.error("לא הצלחנו לפתוח שיחה");
          setLoading(false);
          return;
        }
        thread = created;
      }
      if (cancelled || !thread) return;
      setThreadId(thread.id);
      const { data: msgs } = await supabase
        .from("marketplace_chat_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      setMessages((msgs as Message[]) ?? []);
      // Mark thread as read for current user
      const patch = user.id === sellerId ? { seller_unread: 0 } : { buyer_unread: 0 };
      await supabase.from("marketplace_chat_threads").update(patch).eq("id", thread.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, listingId, sellerId]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !threadId || !body.trim()) return;

    // Anti-spam throttle
    const now = Date.now();
    const recent = sendTimes.filter((t) => now - t < SPAM_WINDOW_MS);
    if (recent.length >= SPAM_LIMIT) {
      const waitMs = SPAM_WINDOW_MS - (now - recent[0]);
      const waitSec = Math.ceil(waitMs / 1000);
      setCooldown(waitSec);
      toast.error(`אנטי-ספאם: המתן ${waitSec} שניות בין הודעות`);
      return;
    }

    setSending(true);
    const text = body.trim().slice(0, 2000);
    const { error } = await supabase.from("marketplace_chat_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: text,
    });
    setSending(false);
    if (error) {
      if (error.message?.includes("BLOCKED")) {
        toast.error("לא ניתן לשלוח — אחד הצדדים חסם את השני");
      } else {
        toast.error("שליחה נכשלה");
      }
      return;
    }
    setSendTimes([...recent, now]);
    setBody("");
  };

  const blockOther = async () => {
    if (!user || !otherUserId) return;
    if (!confirm("לחסום משתמש זה? לא תקבל ממנו הודעות נוספות.")) return;
    const { error } = await supabase.from("chat_blocks").insert({
      blocker_id: user.id,
      blocked_id: otherUserId,
    });
    if (error && !error.message.includes("duplicate")) {
      toast.error("חסימה נכשלה");
      return;
    }
    toast.success("המשתמש נחסם");
    setOpen(false);
  };

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => toast.error("יש להתחבר כדי לשלוח הודעה")}>
        <MessageCircle className="h-4 w-4" />שלח הודעה
      </Button>
    );
  }

  if (!isBuyer) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="h-4 w-4" />שלח הודעה מהירה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 flex flex-col h-[80vh] sm:h-[600px]">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-right text-base line-clamp-1 flex-1">צ'אט עם המוכר · {listingTitle}</DialogTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={blockOther} className="text-destructive">
                  <ShieldOff className="h-4 w-4" />חסום משתמש
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="px-3 pt-3">
          <DealConfirmationPrompt listingId={listingId} />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              שלח הודעה ראשונה למוכר. שמור על שיח מכבד.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                      mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"
                    }`}
                  >
                    {m.body}
                    <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t p-2 bg-background space-y-1">
          {cooldown > 0 && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 px-1">
              אנטי-ספאם: המתן {cooldown} שניות לפני שליחה נוספת
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={cooldown > 0 ? `המתן ${cooldown}ש...` : "כתוב הודעה..."}
              className="flex-1"
              maxLength={2000}
              disabled={cooldown > 0}
            />
            <Button onClick={send} disabled={sending || !body.trim() || cooldown > 0} size="icon">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
