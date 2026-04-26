import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Link as LinkIcon, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Minimal WYSIWYG editor — bold / italic / underline / H2 / lists / link.
 * Stores content as HTML. RTL-friendly.
 * Uses document.execCommand which is deprecated but still universally supported
 * for simple inline formatting and avoids adding a heavy dependency.
 */
export function RichTextEditor({ value, onChange, placeholder, rows = 6, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Sync external value into the contenteditable only when it differs,
  // preventing caret jumps while the user is typing.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const handleInput = () => {
    onChange(ref.current?.innerHTML ?? "");
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Paste as plain text to avoid messy external markup
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const promptLink = () => {
    const url = window.prompt("הדבק כתובת URL:", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  const Btn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  const isEmpty = !value || value === "<br>" || value === "<p></p>";

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", focused && "ring-1 ring-ring", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
        <Btn icon={Bold} label="מודגש (Ctrl+B)" onClick={() => exec("bold")} />
        <Btn icon={Italic} label="נטוי (Ctrl+I)" onClick={() => exec("italic")} />
        <Btn icon={Underline} label="קו תחתון (Ctrl+U)" onClick={() => exec("underline")} />
        <span className="mx-1 h-4 w-px bg-border" />
        <Btn icon={Heading2} label="כותרת" onClick={() => exec("formatBlock", "<h2>")} />
        <Btn icon={List} label="רשימה" onClick={() => exec("insertUnorderedList")} />
        <Btn icon={ListOrdered} label="רשימה ממוספרת" onClick={() => exec("insertOrderedList")} />
        <span className="mx-1 h-4 w-px bg-border" />
        <Btn icon={LinkIcon} label="קישור" onClick={promptLink} />
        <Btn icon={Eraser} label="נקה עיצוב" onClick={() => exec("removeFormat")} />
      </div>
      <div className="relative">
        <div
          ref={ref}
          contentEditable
          dir="rtl"
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "prose prose-sm max-w-none p-3 text-sm outline-none",
            "[&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2",
            "[&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5",
            "[&_a]:text-primary [&_a]:underline",
          )}
          style={{ minHeight: `${rows * 1.5}rem` }}
          suppressContentEditableWarning
        />
        {isEmpty && !focused && (
          <div className="pointer-events-none absolute right-3 top-3 text-sm text-muted-foreground">
            {placeholder ?? "הקלד תיאור..."}
          </div>
        )}
      </div>
    </div>
  );
}
