import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Plus, Crown, Eye,
  Music2, MessageSquare, Loader2, Upload,
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [creatorChanged, setCreatorChanged] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const storyRowRef = useRef<HTMLDivElement>(null);
  const prevCreatorIdRef = useRef<string | null>(null);

  const loadShorts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shorts_videos")
      .select("id, creator_id, title, description, video_url, thumbnail_url, is_premium, views_count, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);

    const rows = data ?? [];
    if (rows.length === 0) { setShorts([]); setLoading(false); return; }

    const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
    const { data: profs } = await supabase
      .from("profiles").select("id, display_name, avatar_url")
      .in("id", creatorIds);
    const pmap = new Map((profs ?? []).map((p) => [p.id, p]));

    // Likes & comment counts
    const { data: likeAgg } = await supabase
      .from("user_likes").select("item_id")
      .eq("item_type", "shorts_video")
      .in("item_id", rows.map((r) => r.id));
    const likeCounts = new Map<string, number>();
    for (const l of likeAgg ?? []) likeCounts.set(l.item_id, (likeCounts.get(l.item_id) || 0) + 1);

    const list: Short[] = rows.map((r) => {
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
        comments: 0,
        views: r.views_count ?? 0,
        uploadedAgo: formatAgo(r.created_at),
        isPremium: r.is_premium,
      };
    });
    setShorts(list);
    setLoading(false);

    // Load my likes
    if (user) {
      const { data: myLikes } = await supabase
        .from("user_likes").select("item_id")
        .eq("user_id", user.id).eq("item_type", "shorts_video")
        .in("item_id", list.map((s) => s.id));
      setLikedSet(new Set((myLikes ?? []).map((l) => l.item_id)));
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
    const onEnd = () => setActiveIndex((i) => (i + 1) % Math.max(shorts.length, 1));
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [activeIndex, shorts.length, current?.id]);

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

  const toggleLike = async (id: string) => {
    if (!user) { toast.error("יש להתחבר כדי לסמן לייק"); return; }
    const liked = likedSet.has(id);
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(id); else next.add(id);
      return next;
    });
    if (liked) {
      await supabase.from("user_likes").delete()
        .eq("user_id", user.id).eq("item_type", "shorts_video").eq("item_id", id);
    } else {
      await supabase.from("user_likes")
        .insert({ user_id: user.id, item_type: "shorts_video", item_id: id });
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
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <div className="rounded-2xl border border-border/60 bg-card-elevated p-4">
              <div className="mb-2 text-xs font-semibold uppercase text-primary">מומלץ עבורך</div>
              <p className="text-sm text-muted-foreground">צפה בכל הסרטונים של המוזיקאים שאתה אוהב</p>
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
                onTogglePlay={togglePlay}
                onToggleMute={() => setIsMuted((m) => !m)}
                onLike={() => toggleLike(current.id)}
                onShare={shareWhatsApp}
                onComment={() => toast.info("תגובות בקרוב")}
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

        <div className="lg:hidden">
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
              onTogglePlay={togglePlay}
              onToggleMute={() => setIsMuted((m) => !m)}
              onLike={() => toggleLike(current.id)}
              onShare={shareWhatsApp}
              onComment={() => toast.info("תגובות בקרוב")}
              fmt={fmt}
              mobileFull
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- STORY ROW ---------- */
function StoryRow({
  shorts, activeIndex, progress, onSelect, rowRef,
}: {
  shorts: Short[]; activeIndex: number; progress: number;
  onSelect: (i: number) => void; rowRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={rowRef} className="mb-4 flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
      <button className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-card hover:border-primary">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <span className="text-xs font-medium">אתה</span>
      </button>
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
              "relative h-16 w-16 rounded-full p-[2px] transition-all",
              s.isPremium
                ? "bg-gradient-to-tr from-primary via-primary-glow to-primary"
                : "bg-gradient-to-tr from-muted-foreground/40 to-muted",
              active && "scale-110 shadow-gold",
            )}>
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={s.creator.avatar || undefined} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {s.creator.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {active && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="oklch(0.78 0.14 75)" strokeWidth="3"
                    strokeDasharray={`${(progress / 100) * 301.6} 301.6`} />
                </svg>
              )}
            </div>
            <span className={cn("max-w-[70px] truncate text-xs", active && "font-semibold text-primary")}>
              {s.creator.name}
            </span>
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
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
  fmt: (n: number) => string;
  mobileFull?: boolean;
};

function VideoPlayer(props: VideoPlayerProps) {
  const {
    short, videoRef, isMuted, isPlaying, progress, liked, creatorChanged,
    onTogglePlay, onToggleMute, onLike, onShare, onComment, fmt, mobileFull,
  } = props;

  return (
    <div className={cn(
      "relative mx-auto overflow-hidden rounded-2xl bg-black shadow-2xl",
      mobileFull ? "aspect-[9/16] max-h-[80vh] w-full" : "aspect-[9/16] max-h-[78vh] w-full max-w-[420px]"
    )}>
      <video
        ref={videoRef}
        key={short.id}
        src={short.videoUrl}
        poster={short.poster ?? undefined}
        autoPlay
        muted={isMuted}
        playsInline
        className="h-full w-full object-cover animate-fade-in"
        onClick={onTogglePlay}
      />

      <div className="absolute left-0 right-0 top-0 h-1 bg-white/20">
        <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${progress}%` }} />
      </div>

      {short.isPremium && (
        <Badge className="absolute right-3 top-3 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
          <Crown className="ml-1 h-3 w-3" />
          PREMIUM
        </Badge>
      )}

      {!isPlaying && (
        <button onClick={onTogglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/20 p-5 backdrop-blur-sm">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </button>
      )}

      <button
        onClick={onToggleMute}
        className="absolute right-3 top-14 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4">
        <ActionBtn icon={<Heart className={cn("h-6 w-6", liked && "fill-rose-500 text-rose-500")} />} label={fmt(short.likes + (liked ? 1 : 0))} onClick={onLike} />
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

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pr-20 text-white">
        <div className="mb-2 flex items-center gap-2">
          <div className={cn(
            "rounded-full p-[3px] transition-all duration-700",
            creatorChanged
              ? "bg-gradient-to-tr from-primary via-primary-glow to-primary scale-125 shadow-gold animate-pulse ring-4 ring-primary/50"
              : "bg-white/40",
          )}>
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={short.creator.avatar || undefined} />
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {short.creator.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="animate-fade-in" key={short.creator_id}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold">{short.creator.name}</span>
              {short.isPremium && <Crown className="h-3 w-3 text-primary" />}
            </div>
            <span className="text-xs opacity-80">{short.uploadedAgo}</span>
          </div>
          <div className="mr-auto">
            <FollowButton targetType="shorts_creator" targetId={short.creator_id} size="sm" className="h-7" />
          </div>
        </div>
        <h3 className="mb-1 text-sm font-bold animate-fade-in" key={short.id}>{short.title}</h3>
        <p className="text-xs opacity-90">{short.description}</p>
        <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
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

  const submit = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (!title.trim()) { toast.error("כותרת חובה"); return; }
    if (!file) { toast.error("יש לבחור סרטון"); return; }
    if (file.size > 60 * 1024 * 1024) { toast.error("גודל מקסימלי 60MB"); return; }

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
            <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground">{file.name} • {(file.size / 1024 / 1024).toFixed(1)}MB</p>}
          </div>
          <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            💡 הסרטון יישלח לאישור מנהל לפני שיוצג בפיד. משתמשים מאושרים מראש (Trusted) פרסומיהם עולים מיד.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={uploading} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
            {uploading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            <Upload className="ml-1 h-4 w-4" />
            העלה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
