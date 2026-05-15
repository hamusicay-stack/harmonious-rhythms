import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Youtube, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Rich editor for forum posts.
 * Supports inline formatting, links, image uploads (forum-attachments bucket),
 * audio/MIDI attachments, and YouTube embeds. Output is HTML rendered with
 * sanitizeForumHtml on the read side.
 */
export function ForumEditor({ value, onChange, placeholder, rows = 6, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileImg = useRef<HTMLInputElement>(null);
  const fileAudio = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, [value]);

  const sync = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  };

  const insertHTML = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    sync();
  };

  const promptLink = () => {
    const url = window.prompt("הדבק כתובת URL:", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  const promptYouTube = () => {
    const url = window.prompt("הדבק קישור YouTube:");
    if (!url) return;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    const id = m?.[1];
    if (!id) { toast.error("קישור YouTube לא תקין"); return; }
    insertHTML(
      `<div class="my-3 aspect-video w-full"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen class="w-full h-full rounded-lg"></iframe></div>`,
    );
  };

  const uploadFile = async (file: File, kind: "image" | "audio") => {
    if (!user) { toast.error("נא להתחבר"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("הקובץ גדול מדי (25MB מקס')"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("forum-attachments").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("forum-attachments").getPublicUrl(path);
      const url = pub.publicUrl;
      if (kind === "image") {
        insertHTML(`<p><img src="${url}" alt="" loading="lazy" class="rounded-lg max-w-full h-auto my-2" /></p>`);
      } else {
        insertHTML(
          `<p><audio controls preload="metadata" src="${url}" class="w-full my-2"></audio></p>`,
        );
      }
    } catch (e) {
      toast.error("שגיאה בהעלאה: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const Btn = ({ icon: Icon, label, onClick, disabled }: { icon: any; label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className={cn("rounded-md border bg-background", focused && "ring-2 ring-ring", className)}>
      <div className="flex items-center gap-1 border-b px-2 py-1 flex-wrap">
        <Btn icon={Bold} label="מודגש" onClick={() => exec("bold")} />
        <Btn icon={Italic} label="נטוי" onClick={() => exec("italic")} />
        <Btn icon={Heading2} label="כותרת" onClick={() => exec("formatBlock", "h2")} />
        <Btn icon={List} label="רשימה" onClick={() => exec("insertUnorderedList")} />
        <Btn icon={ListOrdered} label="ממוספרת" onClick={() => exec("insertOrderedList")} />
        <Btn icon={LinkIcon} label="קישור" onClick={promptLink} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn icon={ImageIcon} label="העלה תמונה" onClick={() => fileImg.current?.click()} disabled={busy} />
        <Btn icon={Music} label="העלה אודיו / MIDI" onClick={() => fileAudio.current?.click()} disabled={busy} />
        <Btn icon={Youtube} label="הטמעת YouTube" onClick={promptYouTube} />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="rtl"
        onInput={sync}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        data-placeholder={placeholder}
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 outline-none min-h-[120px] [&[data-placeholder]:empty:before]:content-[attr(data-placeholder)] [&[data-placeholder]:empty:before]:text-muted-foreground"
        style={{ minHeight: rows * 24 }}
      />
      <input ref={fileImg} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image"); e.target.value = ""; }} />
      <input ref={fileAudio} type="file" accept="audio/*,.mid,.midi" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "audio"); e.target.value = ""; }} />
    </div>
  );
}
