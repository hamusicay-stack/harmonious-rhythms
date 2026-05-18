import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";

export type ChatBubbleMessage = {
  id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export function ChatBubble({
  message,
  isOwn,
}: {
  message: ChatBubbleMessage;
  isOwn: boolean;
}) {
  return (
    <div className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm relative",
          isOwn
            ? "bg-gradient-to-br from-primary to-amber-500/90 text-primary-foreground rounded-bl-md"
            : "bg-muted/80 text-foreground rounded-br-md border border-border/40",
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
          {message.body}
        </p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1 text-[10px] opacity-75",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          <span>
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: he,
            })}
          </span>
          {isOwn &&
            (message.read_at ? (
              <CheckCheck className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            ))}
        </div>
      </div>
    </div>
  );
}
