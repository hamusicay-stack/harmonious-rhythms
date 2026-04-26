import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward, X } from "lucide-react";

/**
 * Shows a 5-second countdown overlay; calls onNext when it reaches 0,
 * unless the user cancels.
 */
export function AutoNextOverlay({
  nextTitle,
  onNext,
  onCancel,
  seconds = 5,
}: {
  nextTitle: string;
  onNext: () => void;
  onCancel: () => void;
  seconds?: number;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onNext();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onNext]);

  const pct = ((seconds - left) / seconds) * 100;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[min(90%,360px)] rounded-2xl border border-white/10 bg-background/95 p-5 text-center shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute end-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="ביטול"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted-foreground">הפרק הבא בעוד {left}…</p>
        <h4 className="mt-1 line-clamp-2 text-base font-semibold">{nextTitle}</h4>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>ביטול</Button>
          <Button size="sm" onClick={onNext}>
            <SkipForward className="me-1 h-4 w-4" />הבא
          </Button>
        </div>
      </div>
    </div>
  );
}
