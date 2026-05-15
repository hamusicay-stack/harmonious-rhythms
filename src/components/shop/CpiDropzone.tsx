import { useRef, useState } from "react";
import { Upload, FileCheck2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALLOWED_EXT = [".n27", ".info"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type CpiFileInfo = {
  path: string;       // storage path inside cpi-uploads
  name: string;       // original filename
  size: number;
};

export function CpiDropzone({
  productId,
  value,
  onChange,
}: {
  productId: string;
  value: CpiFileInfo | null;
  onChange: (info: CpiFileInfo | null) => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!user) { toast.error("יש להתחבר כדי להעלות קובץ זיהוי"); return; }

    const lower = file.name.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
      toast.error("ניתן להעלות רק קבצי .n27 או .info");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("גודל קובץ עד 5MB");
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${user.id}/${productId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("cpi-uploads").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    setUploading(false);

    if (error) { toast.error(error.message); return; }

    onChange({ path, name: file.name, size: file.size });
    toast.success("קובץ זיהוי הועלה בהצלחה");
  };

  const remove = async () => {
    if (value) {
      await supabase.storage.from("cpi-uploads").remove([value.path]);
    }
    onChange(null);
  };

  if (value) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{value.name}</div>
            <div className="text-xs text-muted-foreground">{(value.size / 1024).toFixed(1)} KB · מוכן</div>
          </div>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="הסר קובץ">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
        drag ? "border-amber-400 bg-amber-400/5" : "border-border hover:border-amber-400/60 hover:bg-amber-400/5",
        uploading && "opacity-60 pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".n27,.info"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
      </div>
      <p className="font-semibold text-sm">העלה קובץ זיהוי של הקלידים</p>
      <p className="mt-1 text-xs text-muted-foreground">
        גרור לכאן או לחץ לבחירה · רק .n27 או .info · עד 5MB
      </p>
      {uploading && <p className="mt-2 text-xs text-amber-500">מעבד את הקובץ...</p>}
    </div>
  );
}
