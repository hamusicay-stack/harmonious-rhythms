import { useEffect, useState } from "react";
import { Settings2, Headphones } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

const STORAGE_KEY = "shorts.avSyncOffsetMs";

export function useAVSyncOffset(): [number, (n: number) => void] {
  const [offsetMs, setOffsetMs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(v) ? v : 0;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(offsetMs));
  }, [offsetMs]);
  return [offsetMs, setOffsetMs];
}

export function AVSyncControl({
  offsetMs, onChange, baseLatencyMs, outputLatencyMs,
}: {
  offsetMs: number;
  onChange: (n: number) => void;
  baseLatencyMs: number;
  outputLatencyMs: number;
}) {
  const totalMs = Math.round(baseLatencyMs + outputLatencyMs);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="סנכרון שמע ואזניות"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md ring-1 ring-white/15"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 border-primary/25 bg-zinc-950/95 text-white backdrop-blur-xl"
      >
        <div className="space-y-3 text-end">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" />
            <h4 className="font-display text-sm font-bold">סנכרון שמע ואזניות</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-white/60">
            כיוון עדין לפיצוי על השהיית Bluetooth.
            השהיית מערכת מזוהה: <span className="text-primary">{totalMs}ms</span>
            <span className="mx-1 text-white/40">·</span>
            base {Math.round(baseLatencyMs)}ms / output {Math.round(outputLatencyMs)}ms
          </p>
          <Slider
            min={-300}
            max={300}
            step={10}
            value={[offsetMs]}
            onValueChange={(v) => onChange(v[0] ?? 0)}
            aria-label="Offset Control"
          />
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>-300ms</span>
            <span className="font-mono text-primary">
              {offsetMs > 0 ? "+" : ""}{offsetMs}ms
            </span>
            <span>+300ms</span>
          </div>
          <button
            type="button"
            onClick={() => onChange(0)}
            className="w-full rounded-md bg-white/10 py-1.5 text-xs text-white hover:bg-white/15"
          >
            איפוס לאוטומטי
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
