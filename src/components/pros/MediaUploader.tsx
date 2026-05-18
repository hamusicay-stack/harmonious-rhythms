import { friendlyError } from "@/lib/errors";
import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = {
  bucket?: string;
  accept?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
};

export function MediaUploader({
  bucket = "music-pros",
  accept = "image/*",
  value,
  onChange,
  label = "העלה קובץ",
  folder = "misc",
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("יש להתחבר");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div className="space-y-2">
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
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
          <span className="flex-1 truncate text-xs text-muted-foreground">{value.split("/").pop()}</span>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
          {label}
        </Button>
      )}
    </div>
  );
}

type DirectInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function MediaUrlInput({ value, onChange, placeholder = "URL" }: DirectInputProps) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
