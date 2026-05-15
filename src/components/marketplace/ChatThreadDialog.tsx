import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export function ChatThreadDialog({ listingId, sellerId, listingTitle, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBuyer = user && user.id !== sellerId;

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
    setSending(true);
    const text = body.trim().slice(0, 2000);
    const { error } = await supabase.from("marketplace_chat_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: text,
    });
    setSending(false);
    if (error) {
      toast.error("שליחה נכשלה");
      return;
    }
    setBody("");
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
          <DialogTitle className="text-right text-base line-clamp-1">צ'אט עם המוכר · {listingTitle}</DialogTitle>
        </DialogHeader>

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

        <div className="border-t p-2 flex gap-2 items-end bg-background">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="כתוב הודעה..."
            className="flex-1"
            maxLength={2000}
          />
          <Button onClick={send} disabled={sending || !body.trim()} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
