import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { ShoppingBag, Music2, MessageCircle, MessagesSquare } from "lucide-react";

export type ContextType = "MARKETPLACE" | "PRO" | "FORUM" | "DIRECT";

export const CTX_META: Record<
  ContextType,
  { label: string; className: string; icon: typeof ShoppingBag }
> = {
  MARKETPLACE: {
    label: "יד שנייה",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    icon: ShoppingBag,
  },
  PRO: {
    label: "מקצוענים",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    icon: Music2,
  },
  FORUM: {
    label: "פורום",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: MessagesSquare,
  },
  DIRECT: {
    label: "הודעה פרטית",
    className: "bg-primary/20 text-primary border-primary/40",
    icon: MessageCircle,
  },
};

export type ConversationThread = {
  id: string;
  contextType: ContextType;
  otherProfile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  lastMessageAt: string;
  lastPreview: string | null;
  unread: number;
};

export function ConversationListItem({
  thread,
  active,
  onClick,
}: {
  thread: ConversationThread;
  active: boolean;
  onClick: () => void;
}) {
  const meta = CTX_META[thread.contextType];
  const Icon = meta.icon;
  const name =
    thread.otherProfile?.display_name ??
    thread.otherProfile?.username ??
    "משתמש";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-end px-3 py-3 border-b border-border/40 hover:bg-accent/40 transition-colors flex gap-3 items-start",
        active && "bg-primary/10 border-e-2 border-e-primary",
      )}
    >
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={thread.otherProfile?.avatar_url ?? undefined} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(thread.lastMessageAt), {
              addSuffix: false,
              locale: he,
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 h-4 gap-1", meta.className)}
          >
            <Icon className="h-2.5 w-2.5" />
            {meta.label}
          </Badge>
          {thread.unread > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
              {thread.unread}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {thread.lastPreview ?? "—"}
        </p>
      </div>
    </button>
  );
}
