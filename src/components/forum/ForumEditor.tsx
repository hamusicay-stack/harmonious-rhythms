import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Mention from "@tiptap/extension-mention";
import {
  Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon,
  Image as ImageIcon, Youtube as YoutubeIcon, Music, Loader2, Quote, Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sanitizeForumHtml } from "@/lib/sanitize";
import { compressForumImage } from "@/lib/forum/compressImage";
import { mentionSuggestion } from "./mentionSuggestion";
import "tippy.js/dist/tippy.css";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const BUCKET = "forum-attachments";
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Modern Tiptap-based forum composer.
 * Drop-in replacement for the legacy contentEditable editor.
 * Supports: rich formatting, links, images (compressed + drag/drop/paste),
 * audio/MIDI embeds, YouTube embeds, and @mentions backed by `profiles`.
 * Output is sanitized HTML.
 */
export function ForumEditor({ value, onChange, placeholder, rows = 6, className }: Props) {
  const { user } = useAuth();
  const fileImg = useRef<HTMLInputElement>(null);
  const fileAudio = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const lastEmittedRef = useRef<string>("");

  const uploadFile = useCallback(
    async (file: File, kind: "image" | "audio"): Promise<string | null> => {
      if (!user) { toast.error("נא להתחבר"); return null; }
      if (file.size > MAX_BYTES) { toast.error("הקובץ גדול מדי (25MB מקס')"); return null; }
      setBusy(true);
      try {
        const finalFile = kind === "image" ? await compressForumImage(file) : file;
        const ext = finalFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, finalFile, {
          contentType: finalFile.type || undefined,
          upsert: false,
        });
        if (error) throw error;
        return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      } catch (e) {
        toast.error("שגיאה בהעלאה: " + (e as Error).message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [user],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? "כתוב משהו מדהים..." }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank", class: "text-primary underline" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-2", loading: "lazy" },
      }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: "w-full aspect-video rounded-lg my-2" } }),
      Mention.configure({
        HTMLAttributes: { class: "mention inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 text-primary font-medium" },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: mentionSuggestion,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        dir: "rtl",
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2 outline-none",
          "[&_a]:text-primary [&_a]:underline",
        ),
        style: `min-height:${rows * 24}px`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const it of Array.from(items)) {
          if (it.kind === "file" && it.type.startsWith("image/")) {
            const f = it.getAsFile();
            if (f) {
              event.preventDefault();
              uploadFile(f, "image").then((url) => {
                if (url && editor) editor.chain().focus().setImage({ src: url }).run();
              });
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || !files.length) return false;
        const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (!imgs.length) return false;
        event.preventDefault();
        imgs.forEach((f) =>
          uploadFile(f, "image").then((url) => {
            if (url && editor) editor.chain().focus().setImage({ src: url }).run();
          }),
        );
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const html = sanitizeForumHtml(editor.getHTML());
      lastEmittedRef.current = html;
      onChange(html);
    },
  });

  // Keep editor in sync when parent resets value externally
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming === lastEmittedRef.current) return;
    if (editor.getHTML() === incoming) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [value, editor]);

  const insertYouTube = () => {
    const url = window.prompt("הדבק קישור YouTube:");
    if (!url || !editor) return;
    const ok = editor.commands.setYoutubeVideo({ src: url });
    if (!ok) toast.error("קישור YouTube לא תקין");
  };

  const insertLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("הדבק כתובת URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertAudio = async (file: File) => {
    const url = await uploadFile(file, "audio");
    if (!url || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<p><audio controls preload="metadata" src="${url}" class="w-full my-2"></audio></p>`,
      )
      .run();
  };

  const Btn = ({
    icon: Icon, label, onClick, active, disabled,
  }: { icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded p-1.5 transition disabled:opacity-50",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 backdrop-blur px-2 py-1">
        <Btn icon={Bold} label="מודגש" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <Btn icon={Italic} label="נטוי" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <Btn icon={Heading2} label="כותרת" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Btn icon={List} label="רשימה" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
        <Btn icon={ListOrdered} label="ממוספרת" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
        <Btn icon={Quote} label="ציטוט" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
        <Btn icon={Code} label="קוד" active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} />
        <Btn icon={LinkIcon} label="קישור" active={editor?.isActive("link")} onClick={insertLink} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn icon={ImageIcon} label="העלה תמונה" onClick={() => fileImg.current?.click()} disabled={busy} />
        <Btn icon={Music} label="העלה אודיו / MIDI" onClick={() => fileAudio.current?.click()} disabled={busy} />
        <Btn icon={YoutubeIcon} label="הטמעת YouTube" onClick={insertYouTube} />
        <span className="ms-auto flex items-center gap-2 pe-1 text-xs text-muted-foreground">
          {busy && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> מעלה...</>)}
          <span className="hidden sm:inline opacity-60">@ לאזכור</span>
        </span>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileImg}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const url = await uploadFile(f, "image");
          if (url && editor) editor.chain().focus().setImage({ src: url }).run();
        }}
      />
      <input
        ref={fileAudio}
        type="file"
        accept="audio/*,.mid,.midi"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) insertAudio(f);
        }}
      />
    </div>
  );
}
