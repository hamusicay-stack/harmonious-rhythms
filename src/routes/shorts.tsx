import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Plus, Crown, Eye, Music2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { BannerSlot } from "@/components/BannerSlot";
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

// MOCK DATA — will be replaced with Supabase fetch in step 2
type Short = {
  id: string;
  creator: { name: string; avatar: string; isPremium: boolean };
  videoUrl: string;
  poster: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  views: number;
  uploadedAgo: string;
  isPremium: boolean;
};

const MOCK_SHORTS: Short[] = [
  {
    id: "1",
    creator: { name: "שמוליק", avatar: "", isPremium: true },
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=600",
    title: "סולו קלידים בחתונה",
    description: "🔥 הסולו שכולם מבקשים #קלידים #חתונות",
    likes: 10500, comments: 320, views: 84000, uploadedAgo: "לפני דקה", isPremium: true,
  },
  {
    id: "2",
    creator: { name: "משה לוי", avatar: "", isPremium: true },
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600",
    title: "ביט חדש בסטודיו",
    description: "מקצב חדש שיצרתי הבוקר 🎹",
    likes: 4200, comments: 89, views: 21000, uploadedAgo: "לפני 12 דק׳", isPremium: true,
  },
  {
    id: "3",
    creator: { name: "דוד כהן", avatar: "", isPremium: false },
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1571974599782-87624638275d?w=600",
    title: "מיקס לייב",
    description: "פתיחה של ערב מזרחי 🎤",
    likes: 1800, comments: 45, views: 9300, uploadedAgo: "לפני שעה", isPremium: false,
  },
  {
    id: "4",
    creator: { name: "אבי חיים", avatar: "", isPremium: true },
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=600",
    title: "טכניקת קלידים מתקדמת",
    description: "טריק מהיר לקלידנים 💡",
    likes: 6700, comments: 210, views: 38000, uploadedAgo: "לפני 3 שעות", isPremium: true,
  },
];

function ShortsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const storyRowRef = useRef<HTMLDivElement>(null);

  const current = MOCK_SHORTS[activeIndex];

  // Auto-scroll story row to active
  useEffect(() => {
    const row = storyRowRef.current;
    if (!row) return;
    const el = row.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  // Track video progress
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setProgress((v.currentTime / (v.duration || 1)) * 100);
    const onEnd = () => setActiveIndex((i) => (i + 1) % MOCK_SHORTS.length);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [activeIndex]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const toggleLike = (id: string) => {
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`צפו ב"${current.title}" של ${current.creator.name} ב@המוזיקאי שורטס: ${window.location.href}`)}`;
    window.open(url, "_blank");
  };

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Premium upload bar */}
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
          <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold hover:opacity-90">
            <Plus className="ml-1 h-4 w-4" />
            <span className="hidden sm:inline">העלה סרטון</span>
            <Crown className="mr-1 h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* DESKTOP 3-column layout */}
      <div className="container mx-auto px-4 py-6 md:px-8">
        <div className="hidden gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          {/* LEFT — banner ad */}
          <aside className="space-y-4">
            <BannerSlot placement="shorts_left" className="aspect-[2/3] overflow-hidden rounded-2xl" />
            <div className="rounded-2xl border border-border/60 bg-card-elevated p-4">
              <div className="mb-2 text-xs font-semibold uppercase text-primary">מומלץ עבורך</div>
              <p className="text-sm text-muted-foreground">צפה בכל הסרטונים של המוזיקאים שאתה אוהב</p>
            </div>
          </aside>

          {/* CENTER — stories + video */}
          <main>
            <StoryRow shorts={MOCK_SHORTS} activeIndex={activeIndex} progress={progress} onSelect={setActiveIndex} rowRef={storyRowRef} />
            <VideoPlayer
              short={current}
              videoRef={videoRef}
              isMuted={isMuted}
              isPlaying={isPlaying}
              progress={progress}
              liked={likedSet.has(current.id)}
              onTogglePlay={togglePlay}
              onToggleMute={() => setIsMuted((m) => !m)}
              onLike={() => toggleLike(current.id)}
              onShare={shareWhatsApp}
              onComment={() => toast.info("תגובות בקרוב")}
              fmt={fmt}
            />
          </main>

          {/* RIGHT — secondary ads + info */}
          <aside className="space-y-4">
            <BannerSlot placement="shorts_right_top" className="aspect-square overflow-hidden rounded-2xl" />
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
            <BannerSlot placement="shorts_right_bottom" className="aspect-video overflow-hidden rounded-2xl" />
          </aside>
        </div>

        {/* MOBILE — full-screen TikTok style */}
        <div className="lg:hidden">
          <StoryRow shorts={MOCK_SHORTS} activeIndex={activeIndex} progress={progress} onSelect={setActiveIndex} rowRef={storyRowRef} />
          <VideoPlayer
            short={current}
            videoRef={videoRef}
            isMuted={isMuted}
            isPlaying={isPlaying}
            progress={progress}
            liked={likedSet.has(current.id)}
            onTogglePlay={togglePlay}
            onToggleMute={() => setIsMuted((m) => !m)}
            onLike={() => toggleLike(current.id)}
            onShare={shareWhatsApp}
            onComment={() => toast.info("תגובות בקרוב")}
            fmt={fmt}
            mobileFull
          />
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
      {/* YOU */}
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
function VideoPlayer({
  short, videoRef, isMuted, isPlaying, progress, liked,
  onTogglePlay, onToggleMute, onLike, onShare, onComment, fmt, mobileFull,
}: {
  short: Short;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean; isPlaying: boolean; progress: number; liked: boolean;
  onTogglePlay: () => void; onToggleMute: () => void;
  onLike: () => void; onShare: () => void; onComment: () => void;
  fmt: (n: number) => string;
  mobileFull?: boolean;
}) {
  return (
    <div className={cn(
      "relative mx-auto overflow-hidden rounded-2xl bg-black shadow-2xl",
      mobileFull ? "aspect-[9/16] max-h-[80vh] w-full" : "aspect-[9/16] max-h-[78vh] w-full max-w-[420px]"
    )}>
      <video
        ref={videoRef}
        key={short.id}
        src={short.videoUrl}
        poster={short.poster}
        autoPlay
        muted={isMuted}
        playsInline
        className="h-full w-full object-cover"
        onClick={onTogglePlay}
      />

      {/* progress bar */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-white/20">
        <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${progress}%` }} />
      </div>

      {/* premium badge */}
      {short.isPremium && (
        <Badge className="absolute right-3 top-3 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
          <Crown className="ml-1 h-3 w-3" />
          PREMIUM
        </Badge>
      )}

      {/* play/pause overlay */}
      {!isPlaying && (
        <button onClick={onTogglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/20 p-5 backdrop-blur-sm">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </button>
      )}

      {/* mute button */}
      <button
        onClick={onToggleMute}
        className="absolute right-3 top-14 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* RIGHT side action stack */}
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

      {/* BOTTOM info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pr-20 text-white">
        <div className="mb-2 flex items-center gap-2">
          <Avatar className="h-9 w-9 border-2 border-white">
            <AvatarImage src={short.creator.avatar || undefined} />
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {short.creator.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold">{short.creator.name}</span>
              {short.creator.isPremium && <Crown className="h-3 w-3 text-primary" />}
            </div>
            <span className="text-xs opacity-80">{short.uploadedAgo}</span>
          </div>
          <Button size="sm" className="mr-auto h-7 bg-white text-black hover:bg-white/90">עוקב</Button>
        </div>
        <h3 className="mb-1 text-sm font-bold">{short.title}</h3>
        <p className="text-xs opacity-90">{short.description}</p>
        <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
          <Eye className="h-3 w-3" />
          {fmt(short.views)} צפיות
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
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
