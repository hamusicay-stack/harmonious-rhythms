import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Plus, Crown, Eye,
  Music2, MessageSquare, Upload, AlertTriangle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { BannerSlot } from "@/components/BannerSlot";
import { FollowButton } from "@/components/FollowButton";
import { CommentsSheet } from "@/components/shorts/CommentsSheet";
import { HashtagText } from "@/components/shorts/HashtagText";
import { ShortsSkeleton } from "@/components/shorts/ShortsSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_SHORT_FILE_SIZE = 60 * 1024 * 1024;

export const Route = createFileRoute("/shorts")({
  head: () => ({
    meta: [
      { title: "המוזיקאי שורטס — סרטוני מוזיקה קצרים" },
      { name: "description", content: "פיד סרטונים אנכיים של מוזיקאים ומפיקים — קליפים, ביטים, סטוריז ופרפורמנסים." },
      { property: "og:title", content: "המוזיקאי שורטס" },
      { property: "og:description", content: "TikTok של המוזיקאים — הצטרפו לפיד" },
    ],
  }),
  component: ShortsPage,
});

type Short = {
  id: string;
  creator_id: string;
  creator: { name: string; avatar: string | null };
  videoUrl: string;
  poster: string | null;
  title: string;
  description: string;
  likes: number;
  comments: number;
  views: number;
  uploadedAgo: string;
  isPremium: boolean;
};

const formatAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
};

function ShortsPage() {
  const { user, profile } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [creatorChanged, setCreatorChanged] = useState(false);
  const [slideDir, setSlideDir] = useState<"up" | "down" | "left" | "right" | null>(null);
  const [heartPulse, setHeartPulse] = useState(0);
  const [canUpload, setCanUpload] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  // Drag physics (mobile full-screen)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragAxis = useRef<"x" | "y" | null>(null);
  const dragStartTime = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const storyRowRef = useRef<HTMLDivElement>(null);
  const prevCreatorIdRef = useRef<string | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const loadShorts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("shorts_videos")
        .select("id, creator_id, title, description, video_url, thumbnail_url, is_premium, views_count, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) {
        setShorts([]);
        setCommentCounts(new Map());
        setLikedSet(new Set());
        return;
      }

      const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
      const { data: profs, error: profsError } = await supabase
        .from("profiles").select("id, display_name, avatar_url")
        .in("id", creatorIds);
      if (profsError) throw profsError;
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));

      const ids = rows.map((r) => r.id);
      const [{ data: likeAgg, error: likesError }, { data: cmtAgg, error: commentsError }] = await Promise.all([
        supabase.from("user_likes").select("item_id, user_id").eq("item_type", "shorts_video").in("item_id", ids),
        supabase.from("shorts_comments").select("video_id").in("video_id", ids),
      ]);
      if (likesError) throw likesError;
      if (commentsError) throw commentsError;

      const likeCounts = new Map<string, number>();
      for (const l of likeAgg ?? []) likeCounts.set(l.item_id, (likeCounts.get(l.item_id) || 0) + 1);
      const cmtCounts = new Map<string, number>();
      for (const c of cmtAgg ?? []) cmtCounts.set(c.video_id, (cmtCounts.get(c.video_id) || 0) + 1);
      setCommentCounts(cmtCounts);

      let myLikedIds = new Set<string>();
      let followedCreators = new Set<string>();
      const likeAffinityCreators = new Map<string, number>();

      if (user) {
        const [{ data: myLikes, error: myLikesError }, { data: follows, error: followsError }] = await Promise.all([
          supabase.from("user_likes").select("item_id").eq("user_id", user.id).eq("item_type", "shorts_video"),
          supabase.from("user_follows").select("target_id, target_type").eq("follower_id", user.id)
            .in("target_type", ["shorts_creator", "user"]),
        ]);
        if (myLikesError) throw myLikesError;
        if (followsError) throw followsError;

        myLikedIds = new Set((myLikes ?? []).map((l) => l.item_id));
        followedCreators = new Set((follows ?? []).map((f) => f.target_id));
        for (const r of rows) {
          if (myLikedIds.has(r.id)) likeAffinityCreators.set(r.creator_id, (likeAffinityCreators.get(r.creator_id) ?? 0) + 1);
        }
      }

      const scored = rows.map((r) => {
        const ageHrs = Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 3600000);
        const recency = 1 / Math.log2(ageHrs + 2);
        const popularity = (likeCounts.get(r.id) ?? 0) * 2 + (cmtCounts.get(r.id) ?? 0) * 1.5 + (r.views_count ?? 0) * 0.05;
        const followBoost = followedCreators.has(r.creator_id) ? 50 : 0;
        const affinityBoost = (likeAffinityCreators.get(r.creator_id) ?? 0) * 15;
        const premiumBoost = r.is_premium ? 5 : 0;
        const score = recency * 10 + popularity + followBoost + affinityBoost + premiumBoost;
        return { r, score };
      }).sort((a, b) => b.score - a.score);

      const list: Short[] = scored.map(({ r }) => {
        const p = pmap.get(r.creator_id);
        return {
          id: r.id,
          creator_id: r.creator_id,
          creator: { name: p?.display_name ?? "מוזיקאי", avatar: p?.avatar_url ?? null },
          videoUrl: r.video_url,
          poster: r.thumbnail_url,
          title: r.title ?? "",
          description: r.description ?? "",
          likes: likeCounts.get(r.id) ?? 0,
          comments: cmtCounts.get(r.id) ?? 0,
          views: r.views_count ?? 0,
          uploadedAgo: formatAgo(r.created_at),
          isPremium: r.is_premium,
        };
      });

      setShorts(list);
      setLikedSet(myLikedIds);
    } catch (error) {
      console.error("Failed to load shorts feed", error);
      setShorts([]);
      setCommentCounts(new Map());
      setLikedSet(new Set());
      setLoadError(error instanceof Error ? error.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadShorts(); }, [loadShorts]);

  // Check upload permission (admin / trusted / premium)
  useEffect(() => {
    if (!user) { setCanUpload(false); return; }
    (async () => {
      const [{ data: roles }, { data: trusted }, { data: settings }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("shorts_trusted_uploaders").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("shorts_settings").select("auto_approve_all,require_approval").eq("id", 1).maybeSingle(),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      const isTrusted = !!trusted;
      // Anyone logged in can upload — content goes through approval if required
      setCanUpload(true);
      void isAdmin; void isTrusted; void settings;
    })();
  }, [user, profile]);

  // Trigger creator-change ring animation
  useEffect(() => {
    const cur = shorts[activeIndex];
    if (!cur) return;
    const changed = prevCreatorIdRef.current !== null && prevCreatorIdRef.current !== cur.creator_id;
    if (changed) {
      setCreatorChanged(true);
      const t = setTimeout(() => setCreatorChanged(false), 900);
      prevCreatorIdRef.current = cur.creator_id;
      return () => clearTimeout(t);
    }
    prevCreatorIdRef.current = cur.creator_id;
  }, [activeIndex, shorts]);

  const current = shorts[activeIndex];

  // Track video & autoplay next + view increment
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current) return;
    // Increment view
    void supabase.rpc("increment_short_views", { _video_id: current.id });

    const onTime = () => setProgress((v.currentTime / (v.duration || 1)) * 100);
    const onEnd = () => {
      setSlideDir("up");
      // When video ends: prefer NEXT video of the SAME creator.
      // If none remain, jump to the next creator's first video.
      setActiveIndex((i) => {
        const cur = shorts[i];
        if (!cur) return (i + 1) % Math.max(shorts.length, 1);
        // 1) Next video of same creator
        for (let k = i + 1; k < shorts.length; k++) {
          if (shorts[k].creator_id === cur.creator_id) return k;
        }
        // 2) Next different creator
        for (let k = i + 1; k < shorts.length; k++) {
          if (shorts[k].creator_id !== cur.creator_id) return k;
        }
        // 3) Wrap to first different creator from the start
        for (let k = 0; k < i; k++) {
          if (shorts[k].creator_id !== cur.creator_id) return k;
        }
        return (i + 1) % Math.max(shorts.length, 1);
      });
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [activeIndex, shorts, current?.id]);

  // Auto-scroll story row
  useEffect(() => {
    const row = storyRowRef.current;
    if (!row) return;
    const el = row.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const goNext = useCallback(() => {
    setSlideDir("up");
    setActiveIndex((i) => Math.min(i + 1, Math.max(shorts.length - 1, 0)));
  }, [shorts.length]);
  const goPrev = useCallback(() => {
    setSlideDir("down");
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Jump to next/previous DIFFERENT creator (horizontal swipe behavior)
  const goNextCreator = useCallback(() => {
    setSlideDir("left");
    setActiveIndex((i) => {
      const cur = shorts[i];
      if (!cur) return i;
      for (let k = i + 1; k < shorts.length; k++) if (shorts[k].creator_id !== cur.creator_id) return k;
      return i;
    });
  }, [shorts]);
  const goPrevCreator = useCallback(() => {
    setSlideDir("right");
    setActiveIndex((i) => {
      const cur = shorts[i];
      if (!cur) return i;
      for (let k = i - 1; k >= 0; k--) if (shorts[k].creator_id !== cur.creator_id) return k;
      return i;
    });
  }, [shorts]);

  // Clear slide direction after animation completes
  useEffect(() => {
    if (!slideDir) return;
    const t = setTimeout(() => setSlideDir(null), 460);
    return () => clearTimeout(t);
  }, [slideDir, activeIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    dragAxis.current = null;
    dragStartTime.current = Date.now();
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const sy = touchStartY.current, sx = touchStartX.current;
    if (sy == null || sx == null) return;
    const dy = e.touches[0].clientY - sy;
    const dx = e.touches[0].clientX - sx;
    if (!dragAxis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dragAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      } else return;
    }
    // Only follow finger on the active axis; resist with 0.6 factor for premium feel
    if (dragAxis.current === "y") setDragOffset({ x: 0, y: dy * 0.85 });
    else setDragOffset({ x: dx * 0.85, y: 0 });
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const sy = touchStartY.current, sx = touchStartX.current;
    touchStartY.current = null; touchStartX.current = null;
    setDragging(false);
    if (sy == null || sx == null) { setDragOffset({ x: 0, y: 0 }); return; }
    const dy = e.changedTouches[0].clientY - sy;
    const dx = e.changedTouches[0].clientX - sx;
    const dt = Math.max(1, Date.now() - dragStartTime.current);
    const vy = Math.abs(dy) / dt; // px/ms
    const vx = Math.abs(dx) / dt;
    const screenH = window.innerHeight || 800;
    const screenW = window.innerWidth || 400;
    const distRatioY = Math.abs(dy) / screenH;
    const distRatioX = Math.abs(dx) / screenW;
    const axis = dragAxis.current;
    dragAxis.current = null;
    setDragOffset({ x: 0, y: 0 });
    if (axis === "x") {
      if (distRatioX > 0.22 || vx > 0.55) {
        if (dx < 0) goNextCreator(); else goPrevCreator();
      }
    } else if (axis === "y") {
      if (distRatioY > 0.18 || vy > 0.5) {
        if (dy < 0) goNext(); else goPrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goNextCreator(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goPrevCreator(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, goNextCreator, goPrevCreator]);

  // Prefetch next video
  useEffect(() => {
    const next = shorts[activeIndex + 1];
    if (!next?.videoUrl) return;
    const link = document.createElement("link");
    link.rel = "prefetch"; link.as = "video"; link.href = next.videoUrl;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [activeIndex, shorts]);

  const toggleLike = async (id: string) => {
    if (!user) { toast.error("יש להתחבר כדי לסמן לייק"); return; }
    const liked = likedSet.has(id);
    if (!liked) setHeartPulse((n) => n + 1);
    setShorts((prev) => prev.map((s) => s.id === id ? { ...s, likes: Math.max(0, s.likes + (liked ? -1 : 1)) } : s));
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(id); else next.add(id);
      return next;
    });
    let error: Error | null = null;
    if (liked) {
      const { error: deleteError } = await supabase.from("user_likes").delete()
        .eq("user_id", user.id).eq("item_type", "shorts_video").eq("item_id", id);
      error = deleteError;
    } else {
      const { error: insertError } = await supabase.from("user_likes")
        .insert({ user_id: user.id, item_type: "shorts_video", item_id: id });
      error = insertError;
    }

    if (error) {
      setShorts((prev) => prev.map((s) => s.id === id ? { ...s, likes: Math.max(0, s.likes + (liked ? 1 : -1)) } : s));
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (liked) next.add(id); else next.delete(id);
        return next;
      });
      toast.error(error.message);
    }
  };

  const shareWhatsApp = () => {
    if (!current) return;
    const url = `https://wa.me/?text=${encodeURIComponent(`צפו ב"${current.title}" של ${current.creator.name} ב@המוזיקאי שורטס: ${window.location.href}`)}`;
    window.open(url, "_blank");
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[420px]">
            <ShortsSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold">משהו השתבש</h1>
          <p className="max-w-md text-sm text-muted-foreground">לא הצלחנו לטעון את השורטס. בדוק את החיבור ונסה שוב.</p>
          <Button onClick={() => loadShorts()} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <Music2 className="h-12 w-12 text-primary" />
          <h1 className="font-display text-2xl font-bold">המוזיקאי <span className="text-gradient-gold">שורטס</span></h1>
          <p className="text-muted-foreground">עוד אין סרטונים. היה הראשון להעלות!</p>
          {user && (
            <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={loadShorts}>
              <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
                <Upload className="ml-1 h-4 w-4" />העלה סרטון ראשון
              </Button>
            </UploadDialog>
          )}
          {!user && (
            <Link to="/auth"><Button>התחבר כדי להעלות</Button></Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-gold">
              <Music2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">
                המוזיקאי <span className="text-gradient-gold">שורטס</span>
              </h1>
              <p className="text-xs text-muted-foreground">סרטונים קצרים מהמוזיקאים הכי חמים</p>
            </div>
          </div>
          {user ? (
            <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={loadShorts}>
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold hover:opacity-90">
                <Plus className="ml-1 h-4 w-4" />
                <span className="hidden sm:inline">העלה סרטון</span>
                <Crown className="mr-1 h-3 w-3" />
              </Button>
            </UploadDialog>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="outline">התחבר להעלאה</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-8">
        <div className="hidden gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="space-y-4">
            <BannerSlot position="shorts_left" className="aspect-[2/3] overflow-hidden rounded-2xl" />
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-primary">
                ✨ עבורך
              </div>
              <p className="text-sm text-muted-foreground">
                {user
                  ? "הפיד מותאם אישית לפי לייקים ועוקבים שלך"
                  : "התחבר כדי לקבל פיד מותאם אישית"}
              </p>
            </div>
          </aside>

          <main>
            <StoryRow shorts={shorts} activeIndex={activeIndex} progress={progress} onSelect={setActiveIndex} rowRef={storyRowRef} />
            {current && (
              <VideoPlayer
                short={current}
                videoRef={videoRef}
                isMuted={isMuted}
                isPlaying={isPlaying}
                progress={progress}
                liked={likedSet.has(current.id)}
                creatorChanged={creatorChanged}
                slideDir={slideDir}
                onTogglePlay={togglePlay}
                onToggleMute={() => setIsMuted((m) => !m)}
                onLike={() => toggleLike(current.id)}
                onShare={shareWhatsApp}
                onComment={() => setCommentsOpen(true)}
                fmt={fmt}
              />
            )}
          </main>

          <aside className="space-y-4">
            <BannerSlot position="shorts_right_top" className="aspect-square overflow-hidden rounded-2xl" />
            <div className="rounded-2xl border border-border/60 bg-card-elevated p-4">
              <h3 className="mb-2 font-display text-sm font-bold">פורום המוזיקאים</h3>
              <p className="mb-3 text-xs text-muted-foreground">דיונים חמים מהקהילה</p>
              <Link to="/forum">
                <Button variant="outline" size="sm" className="w-full">
                  <MessageSquare className="ml-1 h-3 w-3" />
                  לפורום
                </Button>
              </Link>
            </div>
            <BannerSlot position="shorts_right_bottom" className="aspect-video overflow-hidden rounded-2xl" />
          </aside>
        </div>

        {/* Mobile placeholder spacer (real player rendered below as fixed full-screen) */}
        <div className="lg:hidden h-[1px]" aria-hidden />
      </div>

      {/* MOBILE FULL-SCREEN STAGE */}
      <div
        className="lg:hidden shorts-stage"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating top stories overlay */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/40 to-transparent pb-6 pt-[max(env(safe-area-inset-top),0.5rem)]">
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2 text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow shadow-gold">
                <Music2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-sm font-bold">שורטס</span>
            </div>
            <Link to="/" className="rounded-full bg-white/10 p-1.5 text-white backdrop-blur-sm hover:bg-white/20" aria-label="סגור">
              <X className="h-4 w-4" />
            </Link>
          </div>
          <StoryRow shorts={shorts} activeIndex={activeIndex} progress={progress} onSelect={setActiveIndex} rowRef={storyRowRef} compact />
        </div>

        {current && (
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
              transition: dragging ? "none" : "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <VideoPlayer
              short={current}
              videoRef={videoRef}
              isMuted={isMuted}
              isPlaying={isPlaying}
              progress={progress}
              liked={likedSet.has(current.id)}
              creatorChanged={creatorChanged}
              slideDir={slideDir}
              heartPulse={heartPulse}
              onTogglePlay={togglePlay}
              onToggleMute={() => setIsMuted((m) => !m)}
              onLike={() => toggleLike(current.id)}
              onShare={shareWhatsApp}
              onComment={() => setCommentsOpen(true)}
              fmt={fmt}
              mobileFull
              fullScreen
            />
          </div>
        )}
        <p className="absolute bottom-[max(env(safe-area-inset-bottom),0.25rem)] left-0 right-0 text-center text-[10px] text-white/50 pointer-events-none">
          החלק למעלה לסרטון הבא • שמאלה למעבר בין יוצרים
        </p>
      </div>

      <CommentsSheet
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        videoId={current?.id ?? null}
        onCountChange={(n) => {
          if (!current) return;
          setCommentCounts((prev) => {
            const next = new Map(prev);
            next.set(current.id, n);
            return next;
          });
          setShorts((prev) => prev.map((s) => s.id === current.id ? { ...s, comments: n } : s));
        }}
      />
    </div>
  );
}

/* ---------- STORY ROW ---------- */
function StoryRow({
  shorts, activeIndex, progress, onSelect, rowRef, compact,
}: {
  shorts: Short[]; activeIndex: number; progress: number;
  onSelect: (i: number) => void; rowRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
}) {
  return (
    <div ref={rowRef} className={cn("flex gap-3 overflow-x-auto pb-2 scrollbar-thin shorts-snap-x", compact ? "px-3" : "mb-4 pb-3")}>
      {!compact && (
      <button className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-card hover:border-primary">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <span className="text-xs font-medium">אתה</span>
      </button>
      )}
      {shorts.map((s, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={s.id}
            data-idx={i}
            onClick={() => onSelect(i)}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className={cn(
              "relative rounded-full p-[2px] transition-all duration-700 ease-out animate-fade-in",
              compact ? "h-12 w-12" : "h-16 w-16",
              s.isPremium
                ? "bg-gradient-to-tr from-primary/70 via-primary-glow/70 to-primary/70"
                : "bg-gradient-to-tr from-muted-foreground/30 to-muted",
              active && "scale-105",
            )}>
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-0.5 rounded-full opacity-70"
                  style={{
                    background:
                      "conic-gradient(from 0deg, oklch(0.82 0.10 78 / 0.9), transparent 60%, oklch(0.82 0.10 78 / 0.9))",
                    WebkitMask:
                      "radial-gradient(circle, transparent 60%, black 62%)",
                    mask: "radial-gradient(circle, transparent 60%, black 62%)",
                    animation: "spin 6s linear infinite",
                  }}
                />
              )}
              <Avatar className="relative h-full w-full border-2 border-background">
                <AvatarImage src={s.creator.avatar || undefined} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {s.creator.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {active && (
                <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="oklch(0.78 0.14 75)" strokeWidth="3"
                    strokeDasharray={`${(progress / 100) * 301.6} 301.6`} />
                </svg>
              )}
            </div>
            {!compact && (
              <span className={cn("max-w-[70px] truncate text-xs", active && "font-semibold text-primary")}>
                {s.creator.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- VIDEO PLAYER ---------- */
type VideoPlayerProps = {
  short: Short;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isPlaying: boolean;
  progress: number;
  liked: boolean;
  creatorChanged: boolean;
  slideDir: "up" | "down" | "left" | "right" | null;
  heartPulse?: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
  fmt: (n: number) => string;
  mobileFull?: boolean;
  fullScreen?: boolean;
};

function VideoPlayer(props: VideoPlayerProps) {
  const {
    short, videoRef, isMuted, isPlaying, progress, liked, creatorChanged, slideDir, heartPulse,
    onTogglePlay, onToggleMute, onLike, onShare, onComment, fmt, mobileFull, fullScreen,
  } = props;

  const slideClass =
    slideDir === "up" ? "animate-shorts-up"
      : slideDir === "down" ? "animate-shorts-down"
        : slideDir === "left" ? "animate-shorts-left"
          : slideDir === "right" ? "animate-shorts-right"
            : "";

  return (
    <div className={cn(
      "relative overflow-hidden bg-black will-change-transform",
      fullScreen
        ? "absolute inset-0 h-full w-full"
        : cn(
          "mx-auto rounded-2xl shadow-2xl",
          mobileFull ? "aspect-[9/16] max-h-[80vh] w-full" : "aspect-[9/16] max-h-[78vh] w-full max-w-[420px]",
        ),
      slideClass,
    )}
      key={`${short.id}-${slideDir ?? "none"}`}
    >
      <video
        ref={videoRef}
        key={short.id}
        src={short.videoUrl}
        poster={short.poster ?? undefined}
        autoPlay
        muted={isMuted}
        playsInline
        className="h-full w-full object-cover"
        onClick={onTogglePlay}
      />

      {/* Top progress bar */}
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-white/15 z-20">
        <div className="h-full bg-gradient-to-r from-primary to-primary-glow progress-glow transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {short.isPremium && (
        <Badge className={cn("absolute right-3 z-20 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold", fullScreen ? "top-[calc(env(safe-area-inset-top)+5rem)]" : "top-3")}>
          <Crown className="ml-1 h-3 w-3" />
          PREMIUM
        </Badge>
      )}

      {!isPlaying && (
        <button onClick={onTogglePlay} className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/20 p-5 backdrop-blur-sm ring-1 ring-white/20">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </button>
      )}

      <button
        onClick={onToggleMute}
        className={cn("absolute right-3 z-20 rounded-full bg-black/40 p-2 text-white backdrop-blur-md ring-1 ring-white/15 hover:bg-black/60", fullScreen ? "top-[calc(env(safe-area-inset-top)+5rem)]" : "top-14")}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Center heart-pop overlay */}
      {heartPulse !== undefined && heartPulse > 0 && (
        <div
          key={heartPulse}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          aria-hidden
        >
          <Heart className="h-32 w-32 fill-rose-500 text-rose-500 drop-shadow-[0_0_24px_oklch(0.70_0.22_15/0.7)] animate-heart-pop" />
        </div>
      )}

      <div className={cn("absolute z-20 flex flex-col items-center gap-4", fullScreen ? "bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-2" : "bottom-20 right-3")}>
        <ActionBtn
          icon={<Heart className={cn("h-6 w-6", liked && "fill-rose-500 text-rose-500")} />}
          label={fmt(short.likes + (liked ? 1 : 0))}
          onClick={onLike}
          pop={heartPulse}
        />
        <ActionBtn icon={<MessageCircle className="h-6 w-6" />} label={fmt(short.comments)} onClick={onComment} />
        <ActionBtn
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
              <path d="M20.52 3.48A11.94 11.94 0 0012.04 0C5.46 0 .12 5.34.12 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.65a11.9 11.9 0 005.77 1.47h.01c6.58 0 11.92-5.34 11.92-11.92 0-3.18-1.24-6.17-3.45-8.42zM12.05 21.8h-.01a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.72.98 1-3.62-.24-.37a9.84 9.84 0 01-1.51-5.27c0-5.46 4.45-9.9 9.9-9.9 2.65 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.45 9.9-9.92 9.9zm5.43-7.41c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
            </svg>
          }
          label="WhatsApp"
          onClick={onShare}
          accent
        />
        <ActionBtn icon={<Share2 className="h-6 w-6" />} label="שתף" onClick={onShare} />
      </div>

      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white",
        fullScreen ? "px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-16 pr-20" : "p-4 pr-20",
      )}>
        <div className="mb-2 flex items-center gap-2">
          <div className={cn(
            "rounded-full p-[2px] transition-all duration-700 ease-out",
            creatorChanged
              ? "bg-gradient-to-tr from-primary/70 to-primary-glow/70 scale-105 ring-2 ring-primary/30"
              : "bg-white/30",
          )}>
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={short.creator.avatar || undefined} />
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {short.creator.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="animate-fade-in min-w-0" key={short.creator_id}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate">@{short.creator.name}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_oklch(0.78_0.18_150/0.8)]" />
              {short.isPremium && <Crown className="h-3 w-3 text-primary" />}
            </div>
            <span className="text-xs opacity-80">{short.uploadedAgo}</span>
          </div>
          <div className="mr-auto">
            <FollowButton targetType="shorts_creator" targetId={short.creator_id} size="sm" className="h-7" />
          </div>
        </div>
        {short.title && <h3 className="mb-1 text-sm font-bold animate-fade-in line-clamp-1" key={short.id}>{short.title}</h3>}
        {short.description && (
          <p className="text-xs opacity-95 line-clamp-2 leading-relaxed">
            <HashtagText text={short.description} />
          </p>
        )}
        <div className="mt-2 flex items-center gap-1 text-[11px] opacity-70">
          <Eye className="h-3 w-3" />
          {fmt(short.views)} צפיות
        </div>
      </div>
    </div>
  );
}

type ActionBtnProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
};

function ActionBtn({ icon, label, onClick, accent }: ActionBtnProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white">
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm transition hover:scale-110",
        accent ? "bg-emerald-500/90 hover:bg-emerald-500" : "bg-black/40 hover:bg-black/60"
      )}>
        {icon}
      </div>
      <span className="text-[11px] font-semibold drop-shadow">{label}</span>
    </button>
  );
}

/* ---------- UPLOAD DIALOG ---------- */
function UploadDialog({
  children, open, onOpenChange, onUploaded,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("video/")) {
      toast.error("יש לבחור קובץ וידאו תקין");
      return;
    }
    if (nextFile.size > MAX_SHORT_FILE_SIZE) {
      toast.error("גודל מקסימלי 60MB");
      return;
    }
    setFile(nextFile);
  };

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (!title.trim()) { toast.error("כותרת חובה"); return; }
    if (!file) { toast.error("יש לבחור סרטון"); return; }
    if (file.size > MAX_SHORT_FILE_SIZE) { toast.error("גודל מקסימלי 60MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("shorts").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }

    const { data: pub } = supabase.storage.from("shorts").getPublicUrl(path);

    const { error: insErr } = await supabase.from("shorts_videos").insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      video_url: pub.publicUrl,
      status: "pending",
    });
    setUploading(false);
    if (insErr) { toast.error(insErr.message); return; }

    toast.success("הסרטון הועלה! יוצג לאחר אישור מנהל (אם נדרש)");
    setTitle(""); setDescription(""); setFile(null);
    onOpenChange(false);
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">העלאת סרטון שורטס</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>כותרת *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="למשל: סולו קלידים בחתונה" />
          </div>
          <div className="space-y-2">
            <Label>תיאור</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="תאר את הסרטון, האשטגים..." />
          </div>
          <div className="space-y-2">
            <Label>קובץ סרטון (עד 60MB, פורמט MP4 מומלץ, יחס אנכי 9:16) *</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="sr-only">בחר סרטון קיים</span>
                <Input type="file" accept="video/*" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <div className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground">
                  פתח מצלמה
                </div>
              </label>
            </div>
            {file && <p className="text-xs text-muted-foreground">{file.name} • {(file.size / 1024 / 1024).toFixed(1)}MB</p>}
          </div>
          <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            💡 הסרטון יישלח לאישור מנהל לפני שיוצג בפיד. משתמשים מאושרים מראש (Trusted) פרסומיהם עולים מיד.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={uploading} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
            {uploading && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />}
            <Upload className="ml-1 h-4 w-4" />
            העלה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
