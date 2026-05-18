import { friendlyError } from "@/lib/errors";
import { useRef, useState } from "react";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
};

/** Simple image upload + URL field for admin theme editor. */
export function ThemeImageField({
  label,
  value,
  onChange,
  bucket = "organ-themes",
  folder = "banners",
  accept = "image/*",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2 items-center">
        {value ? (
          <div className="relative h-12 w-20 rounded border overflow-hidden bg-muted/30">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-0 right-0 bg-destructive text-white rounded-bl px-1"
              aria-label="הסר"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded border border-dashed bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Upload className="h-3 w-3 ml-1" />}
          העלה
        </Button>
      </div>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="או הדבק URL"
        className="text-xs"
      />
    </div>
  );
}
