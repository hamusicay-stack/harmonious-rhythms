import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Plus, Crown, Music2,
  AlertTriangle, GraduationCap, Sparkles, ShoppingCart, Guitar, ChevronLeft,
  Play, Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { CommentsSheet } from "@/components/shorts/CommentsSheet";
import { HashtagText } from "@/components/shorts/HashtagText";
import { ShortsSkeleton } from "@/components/shorts/ShortsSkeleton";
import { UploadDialog } from "@/components/shorts/UploadDialog";
import { KaraokeLyrics } from "@/components/shorts/KaraokeLyrics";
import { AVSyncControl, useAVSyncOffset } from "@/components/shorts/AVSyncControl";
import { useCachedVideoUrl } from "@/hooks/useCachedVideoUrl";
import { useShortsAnalytics } from "@/hooks/useShortsAnalytics";
import { useFloatingShort } from "@/contexts/FloatingShortContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  validateSearch: (s: Record<string, unknown>) => ({
    shortsId: typeof s.shortsId === "string" ? s.shortsId : undefined,
    t: typeof s.t === "string" ? Number(s.t) : typeof s.t === "number" ? s.t : undefined,
  }),
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
  creator: { name: string; avatar: string | null; username: string | null };
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
  productId: string | null;
  marketplaceListingId: string | null;
  isHiRes: boolean;
  audioBitrate: number | null;
  lyricsUrl: string | null;
  lyricsOffset: number;
};

function ShortsPage() {
  const { user } = useAuth();
  const { stop: stopFloatingAudio } = useAudioPlayer();
  const { short: pinnedShort, dismiss: dismissPip } = useFloatingShort();
  const { shortsId: deepLinkId, t: deepLinkT } = Route.useSearch();
  useEffect(() => { stopFloatingAudio(); dismissPip(); }, [stopFloatingAudio, dismissPip]);

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

  const [currentProgress, setCurrentProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  /* ---------- Data load ---------- */
  const loadShorts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("shorts_videos")
        .select("id, creator_id, title, description, video_url, thumbnail_url, is_premium, views_count, created_at, course_link, is_hi_res, audio_bitrate, lyrics_url, lyrics_offset, hls_playlist_url, product_id, marketplace_listing_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) { setShorts([]); return; }

      const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name, avatar_url, username").in("id", creatorIds);
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
          product_id?: string | null;
          marketplace_listing_id?: string | null;
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
          productId: rx.product_id ?? null,
          marketplaceListingId: rx.marketplace_listing_id ?? null,
          isHiRes: rx.is_hi_res ?? false,
          audioBitrate: rx.audio_bitrate ?? null,
          lyricsUrl: rx.lyrics_url ?? null,
          lyricsOffset: Number(rx.lyrics_offset ?? 0),
        };
      });

      // Regroup by creator so a creator's videos play back-to-back, IG-Reels style.
      const byCreator = new Map<string, Short[]>();
      for (const s of list) {
        if (!byCreator.has(s.creator_id)) byCreator.set(s.creator_id, []);
        byCreator.get(s.creator_id)!.push(s);
      }
      setShorts(Array.from(byCreator.values()).flat());
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

  /* ---------- Deep link: ?shortsId=X&t=42 ---------- */
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current || !deepLinkId || shorts.length === 0) return;
    const idx = shorts.findIndex((s) => s.id === deepLinkId);
    if (idx < 0) return;
    deepLinkAppliedRef.current = true;
    setActiveIndex(idx);
    // Defer to next frame so the panel exists in the DOM.
    requestAnimationFrame(() => {
      const root = containerRef.current;
      const panel = root?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      panel?.scrollIntoView({ behavior: "auto", block: "start" });
      const t = Number(deepLinkT);
      if (Number.isFinite(t) && t > 0) {
        // Wait for video metadata before seeking.
        const tryStep = (n: number) => {
          const v = videoRefs.current.get(shorts[idx].id);
          if (v && v.readyState >= 1) { try { v.currentTime = t; } catch { /* noop */ } }
          else if (n > 0) setTimeout(() => tryStep(n - 1), 120);
        };
        tryStep(20);
      }
    });
  }, [deepLinkId, deepLinkT, shorts]);

  /* ---------- Stop playback completely when leaving the feed ---------- */
  useEffect(() => {
    return () => {
      // Pause every video element we own
      videoRefs.current.forEach((v) => {
        try { v.pause(); v.muted = true; } catch { /* noop */ }
      });
      // Make sure the floating PiP player is dismissed too
      dismissPip();
    };
  }, [dismissPip]);


  // If user clicks the PiP "expand" link back to /shorts, jump to that short.
  useEffect(() => {
    if (!pinnedShort || shorts.length === 0) return;
    const idx = shorts.findIndex((s) => s.id === pinnedShort.id);
    if (idx >= 0) setActiveIndex(idx);
  }, [pinnedShort, shorts]);

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

  /* ---------- Engagement analytics (heatmap + drop-off) ---------- */
  const currentShortId = shorts[activeIndex]?.id ?? null;
  const activeVideoEl = currentShortId ? videoRefs.current.get(currentShortId) ?? null : null;
  useShortsAnalytics({
    videoId: currentShortId,
    videoEl: activeVideoEl,
    userId: user?.id ?? null,
  });

  /* ---------- Creator grouping (IG-Reels matrix) ---------- */
  const { creatorIndexMap, creatorBoundaries, creators } = useMemo(() => {
    const map: number[] = [];
    const boundaries: number[] = [];
    const cs: { creatorId: string; creator: Short["creator"]; count: number }[] = [];
    let prev: string | null = null;
    let cIdx = -1;
    shorts.forEach((s, i) => {
      if (s.creator_id !== prev) {
        cIdx++;
        boundaries.push(i);
        cs.push({ creatorId: s.creator_id, creator: s.creator, count: 1 });
        prev = s.creator_id;
      } else {
        cs[cIdx].count += 1;
      }
      map.push(cIdx);
    });
    return { creatorIndexMap: map, creatorBoundaries: boundaries, creators: cs };
  }, [shorts]);

  const activeCreatorIdx = creatorIndexMap[activeIndex] ?? 0;
  const activeCreator = creators[activeCreatorIdx];
  const creatorStart = creatorBoundaries[activeCreatorIdx] ?? 0;
  const creatorCount = activeCreator?.count ?? 0;
  const activeVideoIdx = activeIndex - creatorStart;

  /* ---------- Track current video progress for segmented bars ---------- */
  useEffect(() => {
    setCurrentProgress(0);
    const cur = shorts[activeIndex];
    if (!cur) return;
    const v = videoRefs.current.get(cur.id);
    if (!v) return;
    const onTime = () => {
      if (v.duration > 0) setCurrentProgress(Math.min(1, v.currentTime / v.duration));
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [activeIndex, shorts]);

  /* ---------- Scroll helpers (vertical snap + horizontal creator skip) ---------- */
  const scrollToFlatIdx = useCallback((idx: number) => {
    const root = containerRef.current;
    if (!root) return;
    const panel = root.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const jumpToCreator = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(creatorBoundaries.length - 1, activeCreatorIdx + delta));
    if (next === activeCreatorIdx) return;
    scrollToFlatIdx(creatorBoundaries[next]);
  }, [activeCreatorIdx, creatorBoundaries, scrollToFlatIdx]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    const s = swipeRef.current; swipeRef.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      jumpToCreator(dx < 0 ? 1 : -1);
    }
  };

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

      {/* IG-Stories overlay: segmented progress + creator + follow + horizontal swipe to skip creator */}
      {activeCreator && (
        <div
          onPointerDown={onHeaderPointerDown}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={() => { swipeRef.current = null; }}
          className="absolute inset-x-0 z-40 px-3 pointer-events-auto"
          style={{
            top: "calc(max(env(safe-area-inset-top), 0.5rem) + 2.75rem)",
            touchAction: "pan-y",
          }}
        >
          <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2">
            {/* Segmented progress bars */}
            <div className="flex items-center gap-1" dir="ltr">
              {Array.from({ length: Math.max(1, creatorCount) }).map((_, i) => {
                const fill = i < activeVideoIdx ? 1 : i === activeVideoIdx ? currentProgress : 0;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`סרטון ${i + 1} מתוך ${creatorCount}`}
                    onClick={(e) => { e.stopPropagation(); scrollToFlatIdx(creatorStart + i); }}
                    className="group h-[3px] flex-1 overflow-hidden rounded-full bg-white/25 backdrop-blur-md"
                  >
                    <span
                      className="block h-full bg-gradient-to-r from-primary to-primary-glow shadow-[0_0_8px_oklch(0.78_0.14_75/0.7)] transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.round(fill * 100)}%` }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Creator avatar carousel — Instagram-style */}
            <div className="flex items-center gap-2 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur-md ring-1 ring-white/10">
              <div
                className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: "none" }}
                dir="ltr"
              >
                {creators.map((c, i) => {
                  const isActive = i === activeCreatorIdx;
                  return (
                    <button
                      key={c.creatorId}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); scrollToFlatIdx(creatorBoundaries[i]); }}
                      className={cn(
                        "group relative shrink-0 rounded-full transition-transform active:scale-95",
                        isActive ? "p-[2px] bg-gradient-to-tr from-primary via-amber-300 to-primary-glow shadow-[0_0_14px_oklch(0.85_0.18_85/0.6)]"
                                 : "p-[2px] bg-white/15 hover:bg-white/30",
                      )}
                      aria-label={c.creator.name}
                      title={c.creator.name}
                    >
                      <Avatar className={cn("h-9 w-9 ring-2 ring-black", isActive && "h-10 w-10")}>
                        <AvatarImage src={c.creator.avatar || undefined} />
                        <AvatarFallback className="bg-secondary text-[10px] font-bold">
                          {c.creator.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary shadow-gold" />
                      )}
                    </button>
                  );
                })}
              </div>
              {user && user.id !== activeCreator.creatorId && (
                <FollowButton
                  targetType="shorts_creator"
                  targetId={activeCreator.creatorId}
                  targetName={activeCreator.creator.name}
                  size="sm"
                  className="h-7 shrink-0 rounded-full px-3 text-[11px]"
                />
              )}
            </div>
          </div>
        </div>
      )}

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
/*                       CONTEXT-AWARE COMMERCE CTA                       */
/* ====================================================================== */

function CommerceHotspot({ short }: { short: Short }) {
  const [productName, setProductName] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);

  // Fetch lightweight display labels for the linked product / listing.
  useEffect(() => {
    let cancelled = false;
    if (short.productId) {
      void supabase.from("shop_products").select("name").eq("id", short.productId).maybeSingle()
        .then(({ data }) => { if (!cancelled) setProductName((data as { name?: string } | null)?.name ?? null); });
    } else setProductName(null);
    if (short.marketplaceListingId) {
      void supabase.from("marketplace_listings").select("title").eq("id", short.marketplaceListingId).maybeSingle()
        .then(({ data }) => { if (!cancelled) setListingTitle((data as { title?: string } | null)?.title ?? null); });
    } else setListingTitle(null);
    return () => { cancelled = true; };
  }, [short.productId, short.marketplaceListingId]);

  // Priority: course → product → marketplace listing
  if (short.courseLink) {
    const to = short.courseLink.startsWith("/") ? short.courseLink : "/academy";
    return (
      <CtaCard
        to={to}
        icon={<GraduationCap className="h-4 w-4" />}
        title="🎓 רכוש את הקורס המלא באקדמיה"
        subtitle="גישה מלאה לשיעורים, תרגולים וקהילה"
      />
    );
  }
  if (short.productId) {
    return (
      <CtaCard
        to="/shop/$productId"
        params={{ productId: short.productId }}
        icon={<ShoppingCart className="h-4 w-4" />}
        title="🛒 קנה אביזרים משלימים מהחנות בהנחה"
        subtitle={productName ?? "אביזר מומלץ — מקצועי, חדש, באחריות"}
      />
    );
  }
  if (short.marketplaceListingId) {
    return (
      <CtaCard
        to="/marketplace/$listingId"
        params={{ listingId: short.marketplaceListingId }}
        icon={<Guitar className="h-4 w-4" />}
        title="🎸 יש לי כזה למכור! צפה במודעה ביד-2"
        subtitle={listingTitle ?? "מודעה פעילה — מציאה ליד שנייה"}
      />
    );
  }
  return null;
}

type CtaCardProps =
  | { to: string; params?: undefined; icon: ReactNode; title: string; subtitle: string }
  | { to: "/shop/$productId"; params: { productId: string }; icon: ReactNode; title: string; subtitle: string }
  | { to: "/marketplace/$listingId"; params: { listingId: string }; icon: ReactNode; title: string; subtitle: string };

function CtaCard(props: CtaCardProps) {
  const { to, icon, title, subtitle } = props;
  const common = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-gold">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-bold text-white">{title}</span>
        <span className="block truncate text-[11px] text-white/70">{subtitle}</span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-primary" />
    </>
  );
  const className = "mb-3 flex items-center gap-2.5 rounded-2xl bg-black/60 px-3 py-2 ring-1 ring-primary/40 shadow-[0_12px_30px_-12px_oklch(0.78_0.14_75/0.5)] backdrop-blur-xl transition hover:bg-black/75 hover:ring-primary/70";

  if ("params" in props && props.params) {
    // Typed param links
    if (to === "/shop/$productId") {
      return <Link to={to} params={props.params as { productId: string }} className={className}>{common}</Link>;
    }
    if (to === "/marketplace/$listingId") {
      return <Link to={to} params={props.params as { listingId: string }} className={className}>{common}</Link>;
    }
  }
  return <Link to={to} className={className}>{common}</Link>;
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
  const [heartPops, setHeartPops] = useState<{ id: number; tx: number; ty: number }[]>([]);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [playPulse, setPlayPulse] = useState<{ id: number; playing: boolean } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const popIdRef = useRef(0);
  const pulseIdRef = useRef(0);
  const likeBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Strict "Studio Quality Only": always pick the highest fidelity source.
  // Prefer HLS only when the browser supports it natively (Safari/iOS);
  // otherwise serve the raw, full-bitrate master so we never downgrade.
  const playbackUrl = (() => {
    if (!short.hlsUrl) return short.videoUrl;
    if (typeof document === "undefined") return short.videoUrl;
    const probe = document.createElement("video");
    const canHls = probe.canPlayType("application/vnd.apple.mpegurl");
    return canHls ? short.hlsUrl : short.videoUrl;
  })();

  // IndexedDB-backed offline cache. Returns a blob: URL on revisits.
  const cachedUrl = useCachedVideoUrl(isActive ? playbackUrl : null);
  const finalSrc = cachedUrl ?? playbackUrl;

  const triggerHeartPop = useCallback((x: number, y: number) => {
    const panel = panelRef.current;
    const likeBtn = likeBtnRef.current;
    let tx = 0;
    let ty = 0;
    if (panel && likeBtn) {
      const pr = panel.getBoundingClientRect();
      const lr = likeBtn.getBoundingClientRect();
      // Vector from tap point to like-button center, relative to panel.
      tx = (lr.left + lr.width / 2) - (pr.left + x);
      ty = (lr.top + lr.height / 2) - (pr.top + y);
    }
    const id = ++popIdRef.current;
    setHeartPops((prev) => [...prev, { id, tx, ty }]);
    setTimeout(() => setHeartPops((prev) => prev.filter((p) => p.id !== id)), 1200);
    if (!liked) onLike();
  }, [liked, onLike]);

  const togglePlayPause = useCallback(() => {
    const v = videoEl;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* noop */ });
      setPlayPulse({ id: ++pulseIdRef.current, playing: true });
    } else {
      v.pause();
      setPlayPulse({ id: ++pulseIdRef.current, playing: false });
    }
    const myId = pulseIdRef.current;
    window.setTimeout(() => {
      setPlayPulse((cur) => (cur && cur.id === myId ? null : cur));
    }, 520);
  }, [videoEl]);

  const handlePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // First interaction unlocks audio
    if (!audioUnlocked) onUnlockAudio();

    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const last = lastTapRef.current;
    if (last && now - last.t < 320 && Math.hypot(x - last.x, y - last.y) < 60) {
      // Second tap → like, cancel pending single-tap toggle.
      if (tapTimerRef.current) { window.clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
      triggerHeartPop(x, y);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { t: now, x, y };
      // Defer play/pause toggle so we can distinguish double-tap.
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        // Audio-unlock taps shouldn't also toggle pause.
        if (audioUnlocked) togglePlayPause();
      }, 280);
    }
  }, [audioUnlocked, onUnlockAudio, triggerHeartPop, togglePlayPause]);

  const showSoundOverlay = isActive && !audioUnlocked;

  return (
    <section
      data-idx={idx}
      className="w-full h-screen snap-start snap-always relative overflow-hidden flex items-center justify-center transform-gpu"
    >
      {/* 9:16 frame: full-screen on mobile, centered card on lg+ */}
      <div
        ref={panelRef}
        onPointerDown={handlePointer}
        className={cn(
          "relative h-full w-full overflow-hidden bg-black",
          "lg:h-[min(92vh,900px)] lg:w-[min(92vh*9/16,520px)] lg:rounded-3xl lg:shadow-[0_30px_80px_-30px_oklch(0.78_0.14_75/0.45)] lg:ring-1 lg:ring-white/10",
        )}
      >
        <video
          ref={(el) => { onRegisterVideo(el); setVideoEl(el); }}
          src={finalSrc}
          poster={short.poster ?? undefined}
          className="absolute inset-0 h-full w-full object-cover transform-gpu will-change-transform"
          muted={isMuted}
          playsInline
          autoPlay
          loop
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          x-webkit-airplay="deny"
        />

        {/* Top safe zone — gradient + premium badge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
        <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          {short.isPremium && (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-glow px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-gold">
              <Crown className="h-3 w-3" /> PREMIUM
            </div>
          )}
          {/* Static Hi-Res badge — platform-wide Studio Quality Only standard */}
          <div className="relative flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-400/95 via-yellow-300/95 to-amber-500/95 px-2.5 py-1 text-[10px] font-bold text-black shadow-[0_0_18px_oklch(0.85_0.18_85/0.6)] ring-1 ring-amber-200/60 backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Hi-Res Audio ✨🎧
            <span className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-amber-300/40 blur-md" />
          </div>
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

        {/* Center Play/Pause pulse — fades out after 500ms */}
        {playPulse && (
          <div
            key={playPulse.id}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md ring-1 ring-white/20"
              style={{ animation: "shortsPlayPulse 500ms ease-out forwards" }}
            >
              {playPulse.playing ? <Play className="h-12 w-12 fill-current" /> : <Pause className="h-12 w-12 fill-current" />}
            </div>
          </div>
        )}

        {/* Fly-to-side heart animations */}
        {heartPops.map((p) => (
          <Heart
            key={p.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-28 w-28 -translate-x-1/2 -translate-y-1/2 fill-rose-500 text-rose-500 drop-shadow-[0_0_24px_oklch(0.7_0.2_15/0.7)] transform-gpu will-change-transform"
            style={{
              ["--fly-tx" as string]: `${p.tx}px`,
              ["--fly-ty" as string]: `${p.ty}px`,
              animation: "shortsHeartFly 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          />
        ))}

        {/* Bottom safe zone — metadata. Strong gradient for readability over bright video. */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32 pb-20 lg:pb-6 px-4 pr-20">
          {/* Commerce hotspot CTA — sits above author block */}
          <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
            <CommerceHotspot short={short} />
          </div>

          <div
            className="pointer-events-auto flex items-center gap-2.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
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
            <h2
              className="pointer-events-auto mt-2 text-base font-bold text-white drop-shadow line-clamp-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {short.title}
            </h2>
          )}
          {short.description && (
            <ExpandableDescription text={short.description} />
          )}
        </div>

        {/* Word-level karaoke lyrics */}
        <KaraokeLyrics
          lyricsUrl={short.lyricsUrl}
          videoEl={videoEl}
          offsetSec={short.lyricsOffset}
          active={isActive}
        />

        {/* Right rail — thumb-zone actions */}
        <div
          className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-2 z-10 flex flex-col items-center gap-4"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <RailButton
            ref={likeBtnRef}
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

function ExpandableDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Heuristic: show toggle if text is long enough to plausibly clamp past 2 lines.
  const canExpand = text.length > 80 || text.includes("\n");
  return (
    <div
      className="pointer-events-auto mt-1"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p
        className={cn(
          "text-xs text-white/90 drop-shadow whitespace-pre-wrap break-words",
          !isExpanded && "line-clamp-2",
        )}
      >
        <HashtagText text={text} />
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-1 text-[12px] font-bold text-primary drop-shadow hover:underline"
        >
          {isExpanded ? "הצג פחות" : "קריאה מלאה..."}
        </button>
      )}
    </div>
  );
}

const RailButton = React.forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: "muted" | "live";
}>(function RailButton({ icon, label, onClick, accent }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
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
});

// Keyframes used by the panel
const SHORTS_KEYFRAMES = `
@keyframes shortsWave {
  from { transform: scaleY(0.4); }
  to   { transform: scaleY(1.6); }
}
@keyframes shortsPlayPulse {
  0%   { transform: scale(0.6); opacity: 0; }
  25%  { transform: scale(1.15); opacity: 1; }
  60%  { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(1.25); opacity: 0; }
}
@keyframes shortsHeartFly {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  20%  { transform: translate(-50%, -50%) scale(1.45); opacity: 1; }
  45%  { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
  100% {
    transform:
      translate(calc(-50% + var(--fly-tx, 0px)), calc(-50% + var(--fly-ty, 0px)))
      scale(0.25);
    opacity: 0;
  }
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
