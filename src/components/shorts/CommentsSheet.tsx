import { useEffect, useState, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { name: string; avatar: string | null };
  pending?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  videoId: string | null;
  onCountChange?: (n: number) => void;
};

const MAX = 500;

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} שע׳`;
  return `${Math.floor(h / 24)} ימים`;
};

export function CommentsSheet({ open, onOpenChange, videoId, onCountChange }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    const { data } = await supabase
      .from("shorts_comments")
      .select("id, author_id, content, created_at")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.author_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const list: Comment[] = rows.map((r) => {
      const p = pmap.get(r.author_id);
      return {
        id: r.id,
        author_id: r.author_id,
        content: r.content,
        created_at: r.created_at,
        author: { name: p?.display_name ?? "משתמש", avatar: p?.avatar_url ?? null },
      };
    });
    setComments(list);
    onCountChange?.(list.length);
    setLoading(false);
  }, [videoId, onCountChange]);

  useEffect(() => {
    if (open && videoId) load();
    if (!open) setText("");
  }, [open, videoId, load]);

  // Autosize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [text]);

  // Cooldown countdown (3s anti-spam window after a successful post)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (posting || cooldown > 0) return;
    const content = text.trim();
    if (!content || !videoId) return;
    if (content.length > MAX) { toast.error("התגובה ארוכה מדי"); return; }
    setPosting(true);

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      author_id: user.id,
      content,
      created_at: new Date().toISOString(),
      author: { name: profile?.display_name ?? "אני", avatar: profile?.avatar_url ?? null },
      pending: true,
    };
    setComments((prev) => [optimistic, ...prev]);
    setText("");
    onCountChange?.(comments.length + 1);

    const { data, error } = await supabase.from("shorts_comments").insert({
      video_id: videoId, author_id: user.id, content,
    }).select("id, created_at").single();
    setPosting(false);
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      onCountChange?.(comments.length);
      toast.error(error.message);
      return;
    }
    setComments((prev) => prev.map((c) => c.id === tempId ? { ...c, id: data.id, created_at: data.created_at, pending: false } : c));
    setCooldown(3);
  };

  const remove = async (id: string) => {
    const prev = comments;
    setComments((p) => p.filter((c) => c.id !== id));
    onCountChange?.(comments.length - 1);
    const { error } = await supabase.from("shorts_comments").delete().eq("id", id);
    if (error) {
      setComments(prev);
      onCountChange?.(prev.length);
      toast.error(error.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[72vh] rounded-t-3xl p-0 flex flex-col border-t border-white/10 bg-background/95 backdrop-blur-xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="border-b border-border/40 px-4 py-2">
          <SheetTitle className="text-right text-base">
            תגובות {comments.length > 0 && <span className="text-muted-foreground font-normal">· {comments.length}</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && comments.length === 0 && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shimmer h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="shimmer h-3 w-24 rounded-full" />
                    <div className="shimmer h-3 w-3/4 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">היה הראשון להגיב ✨</p>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className={cn("flex gap-3 animate-fade-in", c.pending && "opacity-60")}>
              <Link to="/profile" className="shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={c.author.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold">
                    {c.author.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.author.name}</span>
                  <span>·</span>
                  <span>{c.pending ? "שולח..." : ago(c.created_at)}</span>
                  {user?.id === c.author_id && !c.pending && (
                    <button
                      onClick={() => remove(c.id)}
                      className="ms-auto text-destructive/70 hover:text-destructive transition"
                      aria-label="מחק תגובה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div className="border-t border-border/40 p-3 bg-background/80 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <div className="flex gap-2 items-end">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{(profile?.display_name ?? "אני").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX))}
                  placeholder="הוסף תגובה..."
                  rows={1}
                  className="resize-none min-h-[40px] max-h-[140px] py-2 pr-3 pl-12 rounded-2xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                  }}
                />
                {text.length > 0 && (
                  <span className="absolute -bottom-4 right-2 text-[10px] text-muted-foreground">
                    {text.length}/{MAX}
                  </span>
                )}
              </div>
              <Button
                onClick={submit}
                disabled={posting || !text.trim()}
                size="icon"
                className="shrink-0 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                aria-label="שלח"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border/40 p-4 text-center text-sm pb-[max(env(safe-area-inset-bottom),1rem)]">
            <Link to="/auth" className="text-primary font-semibold underline">התחבר כדי להגיב</Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
