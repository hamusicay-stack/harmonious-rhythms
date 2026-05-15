import { useCallback, useState, type DragEvent } from "react";
import { Upload, X, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  hint?: string;
  className?: string;
}

export function Dropzone({ accept = "audio/*", multiple = false, onFiles, hint, className }: Props) {
  const [over, setOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const arr = Array.from(list);
      setFiles((prev) => (multiple ? [...prev, ...arr] : arr));
      onFiles?.(arr);
    },
    [multiple, onFiles]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          over ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50"
        )}
      >
        <Upload className="h-7 w-7 text-muted-foreground" />
        <div className="text-sm font-medium">גרור קובץ לכאן או לחץ לבחירה</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded-md border bg-card px-3 py-1.5 text-xs">
              <span className="flex items-center gap-2 truncate">
                <FileAudio className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground">({(f.size / 1024 / 1024).toFixed(2)}MB)</span>
              </span>
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
