import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { sanitizeHtml } from "@/lib/sanitize";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, Eye, Play, ShoppingBag, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MarketplaceListingCard, type CardListing } from "@/components/marketplace/MarketplaceListingCard";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/news/$slug")({
  component: () => (
    <SiteLayout>
      <NewsArticlePage />
    </SiteLayout>
  ),
});

type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  category: "singles" | "albums" | "events" | "gear_reviews" | "interviews";
  author_id: string | null;
  short_video_id: string | null;
  views_count: number | null;
  created_at: string;
};

type Author = { id: string; display_name: string | null; avatar_url: string | null };
type ShortVideo = { id: string; title: string | null; thumbnail_url: string | null; video_url: string | null };

const CATEGORY_LABELS: Record<Article["category"], string> = {
  singles: "סינגלים חדשים",
  albums: "השקות אלבומים",
  events: "אירועים",
  gear_reviews: "סיקורי ציוד",
  interviews: "ראיונות",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=70";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function resolveEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video", src: url };
  if (/^https?:\/\/.+\/embed\//i.test(url)) return { kind: "iframe", src: url };
  return null;
}

function NewsArticlePage() {
  const { slug } = useParams({ from: "/news/$slug" });
  const [article, setArticle] = useState<Article | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [shortVideo, setShortVideo] = useState<ShortVideo | null>(null);
  const [relatedListings, setRelatedListings] = useState<CardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [notFound, setNotFound] = useState(false);

  // Parallax scroll
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch article + side data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("music_news")
        .select("id,title,slug,summary,content,image_url,video_url,category,author_id,short_video_id,views_count,created_at")
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const a = data as Article;
      setArticle(a);
      setLoading(false);

      // Increment views (fire & forget)
      (supabase as any)
        .from("music_news")
        .update({ views_count: (a.views_count ?? 0) + 1 })
        .eq("id", a.id)
        .then(() => {});

      // Author
      if (a.author_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .eq("id", a.author_id)
          .maybeSingle();
        if (!cancelled && prof) setAuthor(prof as Author);
      }

      // Linked short
      if (a.short_video_id) {
        const { data: vid } = await (supabase as any)
          .from("shorts_videos")
          .select("id,title,thumbnail_url,video_url")
          .eq("id", a.short_video_id)
          .maybeSingle();
        if (!cancelled && vid) setShortVideo(vid as ShortVideo);
      }

      // Related marketplace listings for gear reviews
      if (a.category === "gear_reviews") {
        const { data: listings } = await supabase
          .from("marketplace_listings")
          .select("id,seller_id,title,brand,model,item_condition,price,region,city,images,seller_type,bump_expires_at,is_urgent,is_sold")
          .eq("status", "approved")
          .eq("is_sold", false)
          .order("created_at", { ascending: false })
          .limit(6);
        if (!cancelled && listings) setRelatedListings(listings as unknown as CardListing[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const parallaxStyle = useMemo(
    () => ({ transform: `translate3d(0, ${scrollY * 0.25}px, 0) scale(${1 + Math.min(scrollY, 400) / 4000})` }),
    [scrollY],
  );

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-display mb-3">הכתבה לא נמצאה</h1>
          <Link to="/news" className="text-gold hover:underline">חזרה למגזין</Link>
        </div>
      </div>
    );
  }

  if (loading || !article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="aspect-[21/9] w-full bg-card/60 animate-pulse" />
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
          <div className="h-8 w-3/4 bg-card/60 rounded animate-pulse" />
          <div className="h-4 w-full bg-card/60 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-card/60 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Parallax hero */}
      <div className="relative h-[55vh] min-h-[360px] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 will-change-transform" style={parallaxStyle}>
          <img
            src={article.image_url || FALLBACK_IMAGE}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-10">
            <Link
              to="/news"
              className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-gold mb-4 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              חזרה למגזין
            </Link>
            <Badge
              variant="outline"
              className="mb-3 border-gold/60 text-gold bg-black/40 backdrop-blur-sm"
            >
              {CATEGORY_LABELS[article.category]}
            </Badge>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-gradient-gold leading-tight">
              {article.title}
            </h1>
            {article.summary && (
              <p className="mt-3 text-white/85 text-base sm:text-lg max-w-2xl">{article.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-10 animate-fade-in">
        {/* Metadata strip */}
        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-gold/15 pb-5">
          {author ? (
            <Link
              to="/u/$username"
              params={{ username: author.id }}
              className="flex items-center gap-2 hover:text-gold transition-colors"
            >
              {author.avatar_url ? (
                <img src={author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-gold/30" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center ring-1 ring-gold/30">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
              <span>{author.display_name ?? "מערכת המגזין"}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> מערכת המגזין
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(article.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {(article.views_count ?? 0) + 1} צפיות
          </span>
        </div>

        {/* Linked short */}
        {shortVideo && (
          <Link
            to="/shorts"
            className="group relative mb-8 block overflow-hidden rounded-xl ring-1 ring-gold/30 bg-black/40"
          >
            <div className="relative aspect-video w-full bg-black">
              {shortVideo.thumbnail_url ? (
                <img
                  src={shortVideo.thumbnail_url}
                  alt={shortVideo.title ?? ""}
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-black via-card to-black" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-gold/90 p-4 shadow-gold transition-transform group-hover:scale-110">
                  <Play className="h-8 w-8 text-gold-foreground fill-current" />
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-gold/80 mb-1">סרטון קצר קשור</p>
                <p className="text-sm font-medium text-white line-clamp-1">{shortVideo.title ?? "צפה בשורט"}</p>
              </div>
            </div>
          </Link>
        )}

        {/* Source product video */}
        {article.video_url && (() => {
          const embed = resolveEmbed(article.video_url);
          if (!embed) return null;
          return (
            <div className="mb-8 overflow-hidden rounded-xl ring-1 ring-gold/30 bg-black shadow-gold">
              <div className="aspect-video w-full">
                {embed.kind === "iframe" ? (
                  <iframe
                    src={embed.src}
                    title={article.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <video src={embed.src} controls className="h-full w-full" preload="metadata" />
                )}
              </div>
              <div className="px-4 py-2 text-xs text-gold/80 bg-black/40">🎬 סרטון המוצר מהמקור</div>
            </div>
          );
        })()}

        {/* Content */}
        <div
          className="prose prose-invert max-w-none
            prose-headings:font-display prose-headings:text-gradient-gold
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-p:text-foreground/90 prose-p:leading-relaxed
            prose-a:text-gold prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gold
            prose-li:text-foreground/90
            prose-img:rounded-xl prose-img:ring-1 prose-img:ring-gold/20
            bg-card/30 ring-1 ring-border rounded-xl p-6 sm:p-8 backdrop-blur-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />
      </article>

      {/* Related gear listings */}
      {article.category === "gear_reviews" && relatedListings.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <h2 className="font-display text-2xl font-bold text-gradient-gold">
              ציוד דומה מלוח יד-2 של הקהילה
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scrollbar-thin">
            {relatedListings.slice(0, 6).map((l) => (
              <div key={l.id} className="min-w-[260px] max-w-[280px] snap-start">
                <MarketplaceListingCard listing={l} isBusiness={false} isTrusted={false} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
