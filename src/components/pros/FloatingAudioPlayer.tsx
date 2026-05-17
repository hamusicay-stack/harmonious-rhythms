import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, X, Music2 } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const CROSSFADE_MS = 80;

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FloatingAudioPlayer() {
  const { current, isPlaying, audioRef, toggle, stop, next, previous, hasNext, hasPrevious } = useAudioPlayer();
  const lastUrlRef = useRef<string | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Race-free playback: when `current` changes, fade out, swap src, wait for
  // `canplay`, then fade in.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (lastUrlRef.current === current.url) {
      audio.loop = !!current.loop;
      return;
    }

    let cancelled = false;
    const clearFade = () => {
      if (fadeIntervalRef.current) {
        window.clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    };

    const fadeTo = (target: number, done?: () => void) => {
      clearFade();
      const start = audio.volume;
      const steps = 6;
      let i = 0;
      fadeIntervalRef.current = window.setInterval(() => {
        i += 1;
        const v = start + ((target - start) * i) / steps;
        audio.volume = Math.max(0, Math.min(1, v));
        if (i >= steps) {
          clearFade();
          done?.();
        }
      }, CROSSFADE_MS / 6) as unknown as number;
    };

    const swapAndPlay = () => {
      if (cancelled) return;
      audio.src = current.url;
      audio.loop = !!current.loop;
      audio.volume = 0;
      lastUrlRef.current = current.url;
      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        if (cancelled) return;
        audio.play().then(() => fadeTo(1)).catch(() => {});
      };
      audio.addEventListener("canplay", onCanPlay);
      audio.load();
    };

    if (audio.paused || audio.volume === 0) {
      swapAndPlay();
    } else {
      fadeTo(0, swapAndPlay);
    }

    return () => {
      cancelled = true;
      clearFade();
    };
  }, [current, audioRef]);

  // Time / duration tracking
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime || 0);
    const onMeta = () => setDuration(a.duration || 0);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
    };
  }, [audioRef, current]);

  if (!current) return <audio ref={audioRef} preload="none" className="hidden" />;

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-amber-400/20 bg-background/80 backdrop-blur-xl shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-2"
      role="region"
      aria-label="נגן אודיו גלובלי"
    >
      {/* Progress bar — full width, clickable */}
      <div
        className="group/seek relative h-1 w-full cursor-pointer bg-muted/40"
        onClick={seek}
        role="slider"
        aria-label="התקדמות"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary opacity-0 shadow-gold transition-opacity group-hover/seek:opacity-100"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>

      <div className="container mx-auto flex items-center gap-3 px-3 py-2 md:px-6 md:py-3">
        {/* Track info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20 text-primary">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="truncate text-sm font-semibold">{current.title}</div>
            <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
          </div>
          <div className="hidden shrink-0 tabular-nums text-xs text-muted-foreground sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={previous}
            disabled={!hasPrevious}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35"
            aria-label="פרק קודם"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-gold transition-transform hover:scale-105"
            aria-label={isPlaying ? "השהה" : "נגן"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={next}
            disabled={!hasNext}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35"
            aria-label="הפרק הבא"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={stop}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            aria-label="סגור נגן"
            title="סגור נגן"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={() => {
          if (current?.loop) return;
          hasNext ? next() : stop();
        }}
        className="hidden"
      />
    </div>
  );
}
