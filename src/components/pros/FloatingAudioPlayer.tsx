import { useEffect } from "react";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export function FloatingAudioPlayer() {
  const { current, isPlaying, audioRef, toggle, stop, next, previous, hasNext, hasPrevious } = useAudioPlayer();

  useEffect(() => {
    if (audioRef.current && current) {
      audioRef.current.src = current.url;
      audioRef.current.loop = !!current.loop;
      audioRef.current.play().catch(() => {});
    }
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
