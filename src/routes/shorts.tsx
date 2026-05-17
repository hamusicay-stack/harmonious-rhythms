import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Plus, Crown, Music2,
  AlertTriangle, GraduationCap, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentsSheet } from "@/components/shorts/CommentsSheet";
import { HashtagText } from "@/components/shorts/HashtagText";
import { ShortsSkeleton } from "@/components/shorts/ShortsSkeleton";
import { UploadDialog } from "@/components/shorts/UploadDialog";
import { KaraokeLyrics } from "@/components/shorts/KaraokeLyrics";
import { AVSyncControl, useAVSyncOffset } from "@/components/shorts/AVSyncControl";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  head: () => ({
    meta: [
      { title: "המוזיקאי שורטס — סרטוני מוזיקה קצרים" },
      { name: "description", content: "פיד סרטונים אנכיים של מוזיקאים ומפיקים — קליפים, ביטים וסשנים באיכות אולפן." },
      { property: "og:title", content: "המוזיקאי שורטס" },
      { property: "og:description", content: "TikTok של המוזיקאים — סאונד באיכות אולפן" },
    ],
  }),
  component: ShortsPage,
});

type Short = {
  id: string;
  creator_id: string;
  creator: { name: string; avatar: string | null };
  videoUrl: string;
  hlsUrl: string | null;
  poster: string | null;
  title: string;
  description: string;
  likes: number;
  comments: number;
  views: number;
  isPremium: boolean;
  courseLink: string | null;
  isHiRes: boolean;
  audioBitrate: number | null;
  lyricsUrl: string | null;
  lyricsOffset: number;
};

function ShortsPage() {
  const { user } = useAuth();
  const { stop: stopFloatingAudio } = useAudioPlayer();
  useEffect(() => { stopFloatingAudio(); }, [stopFloatingAudio]);

  const [shorts, setShorts] = useState<Short[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [avSyncOffsetMs, setAvSyncOffsetMs] = useAVSyncOffset();
  const [latency, setLatency] = useState<{ base: number; output: number }>({ base: 0, output: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);

  /* ---------- Data load ---------- */
  const loadShorts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("shorts_videos")
        .select("id, creator_id, title, description, video_url, thumbnail_url, is_premium, views_count, created_at, course_link, is_hi_res, audio_bitrate, lyrics_url, lyrics_offset, hls_playlist_url")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) { setShorts([]); return; }

      const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name, avatar_url").in("id", creatorIds);
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));

      const ids = rows.map((r) => r.id);
      const [{ data: likeAgg }, { data: cmtAgg }] = await Promise.all([
        supabase.from("user_likes").select("item_id").eq("item_type", "shorts_video").in("item_id", ids),
        supabase.from("shorts_comments").select("video_id").in("video_id", ids),
      ]);
      const likeCounts = new Map<string, number>();
      for (const l of likeAgg ?? []) likeCounts.set(l.item_id, (likeCounts.get(l.item_id) || 0) + 1);
      const cmtCounts = new Map<string, number>();
      for (const c of cmtAgg ?? []) cmtCounts.set(c.video_id, (cmtCounts.get(c.video_id) || 0) + 1);

      let myLikes = new Set<string>();
      if (user) {
        const { data: ml } = await supabase.from("user_likes").select("item_id")
          .eq("user_id", user.id).eq("item_type", "shorts_video");
        myLikes = new Set((ml ?? []).map((l) => l.item_id));
      }

      const list: Short[] = rows.map((r) => {
        const p = pmap.get(r.creator_id);
        const rx = r as typeof r & {
          course_link?: string | null;
          is_hi_res?: boolean | null;
          audio_bitrate?: number | null;
          lyrics_url?: string | null;
          lyrics_offset?: number | null;
          hls_playlist_url?: string | null;
        };
        return {
          id: r.id,
          creator_id: r.creator_id,
          creator: { name: p?.display_name ?? "מוזיקאי", avatar: p?.avatar_url ?? null },
          videoUrl: r.video_url,
          hlsUrl: rx.hls_playlist_url ?? null,
          poster: r.thumbnail_url,
          title: r.title ?? "",
          description: r.description ?? "",
          likes: likeCounts.get(r.id) ?? 0,
          comments: cmtCounts.get(r.id) ?? 0,
          views: r.views_count ?? 0,
          isPremium: r.is_premium,
          courseLink: rx.course_link ?? null,
          isHiRes: rx.is_hi_res ?? false,
          audioBitrate: rx.audio_bitrate ?? null,
          lyricsUrl: rx.lyrics_url ?? null,
          lyricsOffset: Number(rx.lyrics_offset ?? 0),
        };
      });

      setShorts(list);
      setLikedSet(myLikes);
    } catch (e) {
      console.error("Shorts load failed", e);
      setLoadError(e instanceof Error ? e.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadShorts(); }, [loadShorts]);

  /* ---------- Active video via IntersectionObserver ---------- */
  useEffect(() => {
    const root = containerRef.current;
    if (!root || shorts.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0.55;
        entries.forEach((e) => {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx) && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            bestIdx = idx;
          }
        });
        if (bestIdx >= 0) setActiveIndex(bestIdx);
      },
      { root, threshold: [0.55, 0.85] }
    );

    const panels = root.querySelectorAll("[data-idx]");
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [shorts.length]);

  /* ---------- Play/pause active video, track views ---------- */
  useEffect(() => {
    const current = shorts[activeIndex];
    videoRefs.current.forEach((v, id) => {
      if (id === current?.id) {
        v.muted = isMuted;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => { /* autoplay blocked */ });
      } else {
        try { v.pause(); v.currentTime = 0; } catch { /* noop */ }
      }
    });
    if (current) void supabase.rpc("increment_short_views", { _video_id: current.id });
  }, [activeIndex, shorts, isMuted]);

  /* ---------- Unlock audio on first interaction ---------- */
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    try {
      const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
        const ctx = audioCtxRef.current;
        void ctx.resume();
        // Spec: total render delay = baseLatency + outputLatency (seconds).
        const base = (ctx.baseLatency ?? 0) * 1000;
        const output = ((ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0) * 1000;
        setLatency({ base, output });
      }
    } catch { /* noop */ }
    setIsMuted(false);
    setAudioUnlocked(true);
  }, [audioUnlocked]);

  /* ---------- Apply Bluetooth AV-sync offset to the active video ---------- */
  useEffect(() => {
    const current = shorts[activeIndex];
    if (!current) return;
    const v = videoRefs.current.get(current.id);
    if (!v) return;
    // Spec formula: total system delay = baseLatency + outputLatency.
    // We compensate by nudging the video presentation timestamp by the
    // negative of (auto-detected latency + user fine-tune).
    const autoMs = latency.base + latency.output;
    const totalSec = (autoMs + avSyncOffsetMs) / 1000;
    if (Math.abs(totalSec) < 0.02) return;
    // Clamp safety window so we never seek wildly.
    const delta = Math.max(-0.4, Math.min(0.4, -totalSec));
    try {
      const target = v.currentTime + delta;
      if (target > 0 && Number.isFinite(target)) v.currentTime = target;
    } catch { /* noop */ }
  }, [activeIndex, shorts, latency, avSyncOffsetMs]);

  /* ---------- Like ---------- */
  const toggleLike = useCallback(async (id: string) => {
    if (!user) { toast.error("רגע — צריך להיכנס לאולפן כדי לסמן לייק"); return; }
    const liked = likedSet.has(id);
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(id); else next.add(id);
      return next;
    });
    setShorts((prev) => prev.map((s) => s.id === id ? { ...s, likes: Math.max(0, s.likes + (liked ? -1 : 1)) } : s));
    if (liked) {
      await supabase.from("user_likes").delete()
        .eq("user_id", user.id).eq("item_type", "shorts_video").eq("item_id", id);
    } else {
      const { error } = await supabase.from("user_likes")
        .insert({ user_id: user.id, item_type: "shorts_video", item_id: id });
      if (error && error.code !== "23505") toast.error("לא הצלחנו לעדכן את הלייק");
    }
  }, [user, likedSet]);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  /* ---------- Loading / error / empty ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-[420px]"><ShortsSkeleton /></div>
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-center text-white">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h1 className="font-display text-2xl font-bold">משהו השתבש</h1>
        <p className="max-w-md text-sm text-white/60">{loadError}</p>
        <Button onClick={loadShorts} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">נסה שוב</Button>
      </div>
    );
  }
  if (shorts.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-center text-white">
        <Music2 className="h-12 w-12 text-primary" />
        <h1 className="font-display text-2xl font-bold">המוזיקאי <span className="text-gradient-gold">שורטס</span></h1>
        <p className="text-white/60">הבמה ריקה — מי עולה ראשון?</p>
        {user ? (
          <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={loadShorts}>
            <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
              <Plus className="ml-1 h-4 w-4" />פתחו את הבמה
            </Button>
          </UploadDialog>
        ) : (
          <Link to="/auth"><Button>כניסה כדי להעלות</Button></Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Desktop ambient frame
        "fixed inset-0 z-30 bg-black",
        "lg:bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_75/0.55),transparent_60%),radial-gradient(ellipse_at_bottom,oklch(0.18_0.03_75/0.55),transparent_55%),#000]",
      )}
    >
      {/* Top bar — outside snap area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <Link to="/" className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow">
            <Music2 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-bold text-white">שורטס</span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          <AVSyncControl
            offsetMs={avSyncOffsetMs}
            onChange={setAvSyncOffsetMs}
            baseLatencyMs={latency.base}
            outputLatencyMs={latency.output}
          />
          {user ? (
            <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={loadShorts}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-gold"
                aria-label="העלה סרטון"
              >
                <Plus className="h-3.5 w-3.5" />העלה
              </button>
            </UploadDialog>
          ) : (
            <Link to="/auth" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">כניסה</Link>
          )}
        </div>
      </div>

      {/* SNAP-SCROLL CONTAINER */}
      <div
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black select-none scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {shorts.map((s, idx) => (
          <ShortPanel
            key={s.id}
            short={s}
            idx={idx}
            isActive={idx === activeIndex}
            isMuted={isMuted}
            audioUnlocked={audioUnlocked}
            liked={likedSet.has(s.id)}
            onRegisterVideo={(el) => {
              if (el) videoRefs.current.set(s.id, el);
              else videoRefs.current.delete(s.id);
            }}
            onUnlockAudio={unlockAudio}
            onToggleMute={() => {
              if (!audioUnlocked) unlockAudio();
              else setIsMuted((m) => !m);
            }}
            onLike={() => toggleLike(s.id)}
            onOpenComments={() => setCommentsOpenFor(s.id)}
            onShare={() => {
              const url = `${window.location.origin}/shorts`;
              const text = `צפו ב"${s.title}" של ${s.creator.name}: ${url}`;
              if (navigator.share) navigator.share({ title: s.title, text, url }).catch(() => {});
              else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            fmt={fmt}
          />
        ))}
      </div>

      <CommentsSheet
        open={!!commentsOpenFor}
        onOpenChange={(o) => { if (!o) setCommentsOpenFor(null); }}
        videoId={commentsOpenFor}
        onCountChange={(n) => {
          if (!commentsOpenFor) return;
          setShorts((prev) => prev.map((s) => s.id === commentsOpenFor ? { ...s, comments: n } : s));
        }}
      />
    </div>
  );
}

/* ====================================================================== */
/*                              SHORT PANEL                               */
/* ====================================================================== */

type PanelProps = {
  short: Short;
  idx: number;
  isActive: boolean;
  isMuted: boolean;
  audioUnlocked: boolean;
  liked: boolean;
  onRegisterVideo: (el: HTMLVideoElement | null) => void;
  onUnlockAudio: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  fmt: (n: number) => string;
};

function ShortPanel({
  short, idx, isActive, isMuted, audioUnlocked, liked,
  onRegisterVideo, onUnlockAudio, onToggleMute, onLike, onOpenComments, onShare, fmt,
}: PanelProps) {
  const [heartPops, setHeartPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [showHiResDetails, setShowHiResDetails] = useState(false);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const popIdRef = useRef(0);

  // Prefer HLS manifest if available AND browser supports it natively
  // (Safari/iOS); otherwise gracefully fall back to the raw storage URL so
  // playback never breaks while ABR is still being generated.
  const playbackUrl = (() => {
    if (!short.hlsUrl) return short.videoUrl;
    if (typeof document === "undefined") return short.videoUrl;
    const probe = document.createElement("video");
    const canHls = probe.canPlayType("application/vnd.apple.mpegurl");
    return canHls ? short.hlsUrl : short.videoUrl;
  })();

  const triggerHeartPop = useCallback((x: number, y: number) => {
    const id = ++popIdRef.current;
    setHeartPops((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setHeartPops((prev) => prev.filter((p) => p.id !== id)), 850);
    if (!liked) onLike();
  }, [liked, onLike]);

  const handlePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // First interaction unlocks audio
    if (!audioUnlocked) onUnlockAudio();

    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const last = lastTapRef.current;
    if (last && now - last.t < 320 && Math.hypot(x - last.x, y - last.y) < 60) {
      triggerHeartPop(x, y);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { t: now, x, y };
    }
  }, [audioUnlocked, onUnlockAudio, triggerHeartPop]);

  const showSoundOverlay = isActive && !audioUnlocked;

  return (
    <section
      data-idx={idx}
      className="w-full h-screen snap-start snap-always relative overflow-hidden flex items-center justify-center transform-gpu"
    >
      {/* 9:16 frame: full-screen on mobile, centered card on lg+ */}
      <div
        onPointerDown={handlePointer}
        className={cn(
          "relative h-full w-full overflow-hidden bg-black",
          "lg:h-[min(92vh,900px)] lg:w-[min(92vh*9/16,520px)] lg:rounded-3xl lg:shadow-[0_30px_80px_-30px_oklch(0.78_0.14_75/0.45)] lg:ring-1 lg:ring-white/10",
        )}
      >
        <video
          ref={(el) => { onRegisterVideo(el); setVideoEl(el); }}
          src={playbackUrl}
          poster={short.poster ?? undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted={isMuted}
          playsInline
          autoPlay
          loop
          preload={isActive ? "auto" : "metadata"}
        />

        {/* Top safe zone — gradient + premium badge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          {short.isPremium && (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-glow px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-gold">
              <Crown className="h-3 w-3" /> PREMIUM
            </div>
          )}
          {short.isHiRes && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowHiResDetails((v) => !v); }}
              className="group relative flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-400/95 via-yellow-300/95 to-amber-500/95 px-2.5 py-1 text-[10px] font-bold text-black shadow-[0_0_18px_oklch(0.85_0.18_85/0.6)] ring-1 ring-amber-200/60 backdrop-blur-md"
              aria-label="Hi-Res Audio"
            >
              <Sparkles className="h-3 w-3" />
              Hi-Res Audio ✨🎧
              <span className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-amber-300/40 blur-md" />
            </button>
          )}
          {short.isHiRes && showHiResDetails && (
            <div className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-mono text-amber-200 backdrop-blur-md ring-1 ring-amber-300/30">
              {short.audioBitrate ?? 320}kbps · 48kHz · Studio
            </div>
          )}
        </div>

        {/* Pulsing sound-on overlay */}
        {showSoundOverlay && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnlockAudio(); }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-[2px]"
            aria-label="הפעל סאונד"
          >
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-gold animate-pulse">
              <Volume2 className="h-12 w-12 text-primary-foreground" />
              <span className="absolute inset-0 -z-10 rounded-full bg-primary/40 blur-2xl animate-ping" />
            </div>
            <div className="flex items-end gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className="block w-1.5 rounded-full bg-primary-foreground/90"
                  style={{
                    height: `${10 + ((i * 7) % 22)}px`,
                    animation: `shortsWave 0.9s ease-in-out ${i * 90}ms infinite alternate`,
                  }}
                />
              ))}
            </div>
            <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white shadow-md">
              לחץ לשמיעת הסאונד באיכות אולפן 🔊
            </p>
          </button>
        )}

        {/* Heart-pop animations */}
        {heartPops.map((p) => (
          <Heart
            key={p.id}
            className="pointer-events-none absolute z-30 h-24 w-24 fill-rose-500 text-rose-500 drop-shadow-2xl"
            style={{
              left: p.x - 48,
              top: p.y - 48,
              animation: "shortsHeartPop 850ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          />
        ))}

        {/* Bottom safe zone — metadata */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-12">
          <div className="pointer-events-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pr-20">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border-2 border-white/40">
                <AvatarImage src={short.creator.avatar || undefined} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {short.creator.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-display text-sm font-bold text-white drop-shadow">
                {short.creator.name}
              </span>
            </div>
            {short.title && (
              <h2 className="mt-2 text-base font-bold text-white drop-shadow line-clamp-2">{short.title}</h2>
            )}
            {short.description && (
              <p className="mt-1 text-xs text-white/85 drop-shadow line-clamp-2">
                <HashtagText text={short.description} />
              </p>
            )}
            {short.courseLink && (
              <Link
                to={short.courseLink.startsWith("/") ? short.courseLink : "/academy"}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-gold"
              >
                <GraduationCap className="h-3.5 w-3.5" />לשיעור המלא
              </Link>
            )}
          </div>
        </div>

        {/* Word-level karaoke lyrics */}
        <KaraokeLyrics
          lyricsUrl={short.lyricsUrl}
          videoEl={videoEl}
          offsetSec={short.lyricsOffset}
          active={isActive}
        />

        {/* Right rail — thumb-zone actions */}
        <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-2 z-10 flex flex-col items-center gap-4">
          <RailButton
            icon={<Heart className={cn("h-7 w-7", liked && "fill-rose-500 text-rose-500")} />}
            label={fmt(short.likes)}
            onClick={onLike}
          />
          <RailButton
            icon={<MessageCircle className="h-7 w-7" />}
            label={fmt(short.comments)}
            onClick={onOpenComments}
          />
          <RailButton
            icon={<Share2 className="h-7 w-7" />}
            label="שתף"
            onClick={onShare}
          />
          <RailButton
            icon={isMuted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
            label={isMuted ? "מושתק" : "סאונד"}
            onClick={onToggleMute}
            accent={isMuted ? "muted" : "live"}
          />
        </div>
      </div>
    </section>
  );
}

function RailButton({
  icon, label, onClick, accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: "muted" | "live";
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-full px-2 py-1.5 text-white transition active:scale-90",
        "hover:bg-white/10",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/15 shadow-lg",
          accent === "live" && "ring-primary/60 bg-primary/25",
          accent === "muted" && "ring-white/30",
        )}
      >
        {icon}
      </span>
      <span className="text-[11px] font-bold drop-shadow">{label}</span>
    </button>
  );
}

// Keyframes used by the panel (sound wave + heart pop)
const SHORTS_KEYFRAMES = `
@keyframes shortsWave {
  from { transform: scaleY(0.4); }
  to   { transform: scaleY(1.6); }
}
@keyframes shortsHeartPop {
  0%   { transform: scale(0.2); opacity: 0; }
  30%  { transform: scale(1.25); opacity: 1; }
  60%  { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
`;

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("shorts-keyframes")) {
  const style = document.createElement("style");
  style.id = "shorts-keyframes";
  style.textContent = SHORTS_KEYFRAMES;
  document.head.appendChild(style);
}

// Suppress unused import warning (kept for future use)
void useMemo;
