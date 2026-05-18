import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Loader2 } from "lucide-react";

export function ChatInput({
  onSend,
  disabled,
  placeholder = "כתוב הודעה...",
}: {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = value.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    try {
      await onSend(text);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 border-t border-border/60 bg-card/40 backdrop-blur flex gap-2 items-end">
      <Button size="icon" variant="ghost" disabled title="קבצים — בקרוב">
        <Paperclip className="h-4 w-4" />
      </Button>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        maxLength={4000}
        disabled={disabled || sending}
        className="resize-none min-h-[40px] max-h-32 bg-background/60"
      />
      <Button
        onClick={submit}
        disabled={sending || disabled || !value.trim()}
        className="gap-1"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        שלח
      </Button>
    </div>
  );
}
