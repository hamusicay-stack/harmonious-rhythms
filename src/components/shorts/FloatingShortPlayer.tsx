import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X, Maximize2, Volume2, VolumeX, GripVertical, Play, Pause } from "lucide-react";
import { useFloatingShort } from "@/contexts/FloatingShortContext";
import { cn } from "@/lib/utils";

const DEFAULT_W = 180;
const DEFAULT_H = 320;
const STORAGE_KEY = "floating-short.pos";

type Pos = { x: number; y: number };

function loadPos(): Pos {
  if (typeof window === "undefined") return { x: 16, y: 80 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Pos;
  } catch { /* noop */ }
  return { x: 16, y: 80 };
}

export function FloatingShortPlayer() {
  const { short, dismiss, updateTime } = useFloatingShort();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [pos, setPos] = useState<Pos>(() => loadPos());
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);

  // Re-attach when entering /shorts — hide PiP because the main page will play it.
  const onShortsRoute = pathname.startsWith("/shorts");

  // Persist position
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  // Initialize playback at startAt
  useEffect(() => {
    if (!short || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = muted;
    try { v.currentTime = short.startAt; } catch { /* noop */ }
    v.play().catch(() => { /* autoplay may block until user gesture */ });
    setPaused(v.paused);
  }, [short?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist last currentTime so re-attach resumes seamlessly
  useEffect(() => {
    if (!short || !videoRef.current) return;
    const v = videoRef.current;
    const onTime = () => updateTime(short.id, v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [short, updateTime]);

  // Dismiss when navigating back into /shorts — the in-page feed takes over
  useEffect(() => {
    if (onShortsRoute && short) dismiss();
  }, [onShortsRoute, short, dismiss]);

  if (!short || onShortsRoute) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const x = Math.max(8, Math.min(window.innerWidth - DEFAULT_W - 8, e.clientX - dragState.current.dx));
    const y = Math.max(8, Math.min(window.innerHeight - DEFAULT_H - 8, e.clientY - dragState.current.dy));
    setPos({ x, y });
  };
  const onPointerUp = () => { dragState.current = null; };

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    const next = !muted; v.muted = next; setMuted(next);
  };

  return (
    <div
      className={cn(
        "fixed z-[60] flex flex-col overflow-hidden rounded-2xl bg-black",
        "shadow-[0_30px_70px_-20px_oklch(0.78_0.14_75/0.5)] ring-1 ring-primary/40",
      )}
      style={{
        width: DEFAULT_W,
        height: DEFAULT_H,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        left: 0, top: 0,
        touchAction: "none",
      }}
    >
      <video
        ref={videoRef}
        src={short.videoUrl}
        poster={short.poster ?? undefined}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        loop
        autoPlay
      />

      {/* Drag handle / top chrome */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative z-10 flex cursor-grab items-center justify-between bg-gradient-to-b from-black/85 to-black/20 px-2 py-1.5 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5 text-white/60" />
        <span className="truncate px-1 text-[10px] font-bold text-white">
          {short.creatorName}
        </span>
        <button
          type="button"
          aria-label="סגור"
          onClick={dismiss}
          className="rounded-full p-0.5 text-white/80 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={paused ? "נגן" : "השהה"}
          className="rounded-full bg-white/10 p-1 text-white backdrop-blur"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <Link
          to="/shorts"
          search={{ shortsId: short.id, t: Math.floor(short.startAt) }}
          aria-label="חזרה לפיד"
          className="rounded-full bg-gradient-to-r from-primary to-primary-glow p-1 text-primary-foreground shadow-gold"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "בטל השתקה" : "השתק"}
          className="rounded-full bg-white/10 p-1 text-white backdrop-blur"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
