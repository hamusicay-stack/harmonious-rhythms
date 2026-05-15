import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GigContractDialog } from "@/components/contract/GigContractDialog";

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

interface Props {
  proId: string;
  /** Required when role="sender" */
  proUserId?: string;
  proName?: string;
  /** Required when role="pro" — the customer that sent the inquiry */
  senderId?: string;
  senderName?: string;
  role?: "sender" | "pro";
  trigger?: React.ReactNode;
}

export function ProChatDialog({
  proId,
  proUserId,
  proName,
  senderId,
  senderName,
  role = "sender",
  trigger,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isProRole = role === "pro";
  const peerName = isProRole ? (senderName || "פונה") : (proName || "מוזיקאי");
  const otherSenderId = isProRole ? senderId! : user?.id;
  const otherProUserId = isProRole ? user?.id : proUserId!;
  const isOwnerOfPro = !isProRole && user?.id === proUserId;

  useEffect(() => {
    if (!open || !user) return;
    if (!isProRole && isOwnerOfPro) return;
    if (isProRole && !senderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let { data: thread } = await supabase
        .from("pro_chat_threads")
        .select("id")
        .eq("pro_id", proId)
        .eq("sender_id", otherSenderId!)
        .maybeSingle();

      if (!thread) {
        const { data: created, error } = await supabase
          .from("pro_chat_threads")
          .insert({ pro_id: proId, pro_user_id: otherProUserId!, sender_id: otherSenderId! })
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
        .from("pro_chat_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      setMessages((msgs as Message[]) ?? []);
      const patch = isProRole ? { pro_unread: 0 } : { sender_unread: 0 };
      await supabase.from("pro_chat_threads").update(patch).eq("id", thread.id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user, proId, otherSenderId, otherProUserId, isProRole, isOwnerOfPro, senderId]);

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`pro-chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pro_chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !threadId || !body.trim()) return;
    setSending(true);
    const text = body.trim().slice(0, 2000);
    const { error } = await supabase.from("pro_chat_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: text,
    });
    setSending(false);
    if (error) { toast.error("שליחה נכשלה"); return; }
    setBody("");
  };

  const triggerBtn = trigger ?? (
    <Button variant="outline" size="sm" className="gap-1.5">
      <MessageCircle className="h-4 w-4" /> {isProRole ? "פתח צ'אט עם הפונה" : "שלח הודעה"}
    </Button>
  );

  if (!user) {
    return (
      <span onClick={(e) => { e.stopPropagation(); navigate({ to: "/auth" }); }}>
        {triggerBtn}
      </span>
    );
  }
  if (!isProRole && isOwnerOfPro) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {triggerBtn}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 flex flex-col h-[80vh] sm:h-[600px]" dir="rtl">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-right text-base line-clamp-1 flex-1">צ'אט עם {peerName}</DialogTitle>
            {isProRole && (
              <GigContractDialog
                clientName={senderName || ""}
                proName={user.user_metadata?.display_name || user.email || ""}
                threadId={threadId}
                senderId={user.id}
              />
            )}
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              שלחו הודעה ראשונה. שמרו על שיח מכבד ומקצועי.
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
