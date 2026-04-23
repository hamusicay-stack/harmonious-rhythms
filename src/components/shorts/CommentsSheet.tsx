import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Comment = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { name: string; avatar: string | null };
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  videoId: string | null;
  onCountChange?: (n: number) => void;
};

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} שע׳`;
  return `${Math.floor(h / 24)} ימים`;
};

export function CommentsSheet({ open, onOpenChange, videoId, onCountChange }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

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
  }, [open, videoId, load]);

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (!text.trim() || !videoId) return;
    setPosting(true);
    const { error } = await supabase.from("shorts_comments").insert({
      video_id: videoId, author_id: user.id, content: text.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shorts_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-right">תגובות ({comments.length})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">היה ראשון להגיב ✨</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 animate-fade-in">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={c.author.avatar || undefined} />
                <AvatarFallback className="text-xs">{c.author.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.author.name}</span>
                  <span>•</span>
                  <span>{ago(c.created_at)}</span>
                  {user?.id === c.author_id && (
                    <button onClick={() => remove(c.id)} className="mr-auto text-destructive hover:opacity-80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div className="border-t p-3 flex gap-2 items-end bg-background">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הוסף תגובה..."
              rows={1}
              className="resize-none min-h-[44px] max-h-32"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
            />
            <Button onClick={submit} disabled={posting || !text.trim()} size="icon" className="shrink-0">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="border-t p-4 text-center text-sm">
            <Link to="/auth" className="text-primary font-semibold underline">התחבר כדי להגיב</Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
