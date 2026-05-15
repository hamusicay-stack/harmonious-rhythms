import { useEffect, useRef } from "react";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const CROSSFADE_MS = 80;

export function FloatingAudioPlayer() {
  const { current, isPlaying, audioRef, toggle, stop, next, previous, hasNext, hasPrevious } = useAudioPlayer();
  const lastUrlRef = useRef<string | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Race-free playback: when `current` changes, fade out, swap src, wait for
  // `canplay`, then fade in. Prevents AbortError from .play()-before-buffer
  // and audio clicks when switching Virtual Organ Main A → Main B.
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
      // Kick off buffering
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

  if (!current) return <audio ref={audioRef} preload="none" className="hidden" />;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 rounded-full border border-border/40 bg-background/85 p-2 pr-4 shadow-2xl backdrop-blur-xl">
        <button
          onClick={previous}
          disabled={!hasPrevious}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35"
          aria-label="פרק קודם"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-gold transition-transform hover:scale-105"
          aria-label={isPlaying ? "השהה" : "נגן"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-sm font-semibold">{current.title}</div>
          <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
        </div>
        <button
          onClick={next}
          disabled={!hasNext}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35"
          aria-label="הפרק הבא"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={stop}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="סגור נגן"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {}}
        onPause={() => {}}
        onEnded={() => { if (current?.loop) return; hasNext ? next() : stop(); }}
        className="hidden"
      />
    </div>
  );
}
