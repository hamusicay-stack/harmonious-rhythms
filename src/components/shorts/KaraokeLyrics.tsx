import { useEffect, useRef, useState } from "react";
import { parseLrc, findActiveLine, type LrcLine } from "@/lib/lrc";
import { cn } from "@/lib/utils";

type Props = {
  lyricsUrl: string | null | undefined;
  videoEl: HTMLVideoElement | null;
  offsetSec?: number; // lyrics-only fine-tune offset
  active: boolean;
};

export function KaraokeLyrics({ lyricsUrl, videoEl, offsetSec = 0, active }: Props) {
  const [lines, setLines] = useState<LrcLine[] | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Fetch + parse the LRC file once per URL.
  useEffect(() => {
    let cancelled = false;
    setLines(null);
    if (!lyricsUrl) return;
    fetch(lyricsUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`LRC ${r.status}`))))
      .then((txt) => { if (!cancelled) setLines(parseLrc(txt)); })
      .catch(() => { if (!cancelled) setLines([]); });
    return () => { cancelled = true; };
  }, [lyricsUrl]);

  // Track video time via rAF only while active+playing.
  useEffect(() => {
    if (!active || !videoEl || !lines || !lines.length) return;
    const tick = () => {
      setCurrentTime(videoEl.currentTime + offsetSec);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, videoEl, lines, offsetSec]);

  if (!lyricsUrl || !lines || lines.length === 0) return null;

  const activeIdx = findActiveLine(lines, currentTime);
  const activeLine = activeIdx >= 0 ? lines[activeIdx] : null;
  const nextLine = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[28%] z-[15] flex flex-col items-center gap-1 px-6 text-center">
      {activeLine && (
        <div className="rounded-2xl bg-black/55 px-4 py-2 backdrop-blur-md ring-1 ring-primary/30 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          <p className="font-display text-lg font-bold leading-snug drop-shadow">
            {activeLine.words.map((w, i) => {
              const wordEnd = activeLine.words[i + 1]?.start ?? activeLine.end ?? w.start + 1.2;
              const isActive = currentTime >= w.start && currentTime < wordEnd;
              const isPast = currentTime >= wordEnd;
              return (
                <span
                  key={i}
                  className={cn(
                    "transition-colors duration-150",
                    isActive && "text-gradient-gold drop-shadow-[0_0_12px_oklch(0.78_0.14_75/0.7)]",
                    !isActive && isPast && "text-white",
                    !isActive && !isPast && "text-white/55",
                  )}
                >
                  {w.text}
                </span>
              );
            })}
          </p>
        </div>
      )}
      {nextLine && (
        <p className="max-w-[90%] truncate text-xs text-white/45">{nextLine.text}</p>
      )}
    </div>
  );
}
