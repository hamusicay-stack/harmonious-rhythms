import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, ShieldCheck, Crown, Play, MessageCircle, Eye } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { labelOf, SPECIALTIES, GENRES } from "@/lib/prosData";

export type ProCardData = {
  id: string;
  display_name: string;
  headline: string | null;
  profile_image: string | null;
  cover_image: string | null;
  brand_color: string | null;
  hourly_price_min: number | null;
  region: string | null;
  cities: string[];
  specialties: string[];
  genres: string[];
  is_verified: boolean;
  subscription_tier: string;
  is_featured: boolean;
};

type Props = {
  pro: ProCardData;
  onRequestQuote?: (proId: string) => void;
};

export function ProCard({ pro, onRequestQuote }: Props) {
  const navigate = useNavigate();
  const { play } = useAudioPlayer();
  const [previewTrack, setPreviewTrack] = useState<{ url: string; title: string } | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: media }, { data: reviews }] = await Promise.all([
        supabase
          .from("music_pro_media")
          .select("url,title")
          .eq("pro_id", pro.id)
          .eq("type", "audio")
          .order("is_featured", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("music_pro_reviews").select("rating").eq("pro_id", pro.id),
      ]);
      if (cancelled) return;
      if (media) setPreviewTrack({ url: media.url, title: media.title || "דמו" });
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        setRating({ avg, count: reviews.length });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pro.id]);

  const brand = pro.brand_color || "#D4A24E";
  const isVip = pro.subscription_tier === "vip";

  const open = () => navigate({ to: "/pros/$proId", params: { proId: pro.id } });

  const onPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewTrack) return;
    play({
      id: pro.id,
      url: previewTrack.url,
      title: previewTrack.title,
      artist: pro.display_name,
      proId: pro.id,
    });
  };

  return (
    <div
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/40 bg-card shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
      style={{ ["--brand" as string]: brand }}
    >
      {/* Cover wash */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-20 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${brand} 0%, transparent 70%)` }}
      />

      {/* Top badges */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
        {isVip && (
          <Badge className="border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-md">
            <Crown className="ml-1 h-3 w-3" /> VIP
          </Badge>
        )}
        {pro.is_verified && (
          <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300">
            <ShieldCheck className="ml-1 h-3 w-3" /> מאומת
          </Badge>
        )}
      </div>

      {/* Play */}
      {previewTrack && (
        <button
          onClick={onPlay}
          className="absolute top-3 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-primary shadow-lg backdrop-blur transition-transform hover:scale-110"
          aria-label="נגן דמו"
        >
          <Play className="h-5 w-5" />
        </button>
      )}

      {/* Cover */}
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        {pro.cover_image ? (
          <img
            src={pro.cover_image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${brand}40, ${brand}10)` }}
          />
        )}
      </div>

      {/* Body */}
      <div className="relative px-5 pb-5 pt-4 text-right">
        {/* Avatar floating */}
        <div className="absolute -top-9 right-5 h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-muted shadow-lg">
          {pro.profile_image ? (
            <img src={pro.profile_image} alt={pro.display_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-xl font-bold text-muted-foreground">
              {pro.display_name.charAt(0)}
            </div>
          )}
        </div>

        <div className="mt-7">
          <h3 className="font-display text-lg font-bold leading-tight">{pro.display_name}</h3>
          {pro.headline && (
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{pro.headline}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {rating.count > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
                <span>({rating.count})</span>
              </span>
            ) : (
              <span>חדש בלוח</span>
            )}
            {(pro.cities[0] || pro.region) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {pro.cities[0] || pro.region}
              </span>
            )}
          </div>

          {pro.hourly_price_min != null && pro.hourly_price_min > 0 && (
            <div className="mt-2 text-sm">
              החל מ-
              <span className="font-display text-base font-bold text-gradient-gold">
                ₪{Number(pro.hourly_price_min).toLocaleString("he-IL")}
              </span>
            </div>
          )}

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pro.specialties.slice(0, 1).map((s) => (
              <Badge key={s} variant="outline" className="text-[11px]">
                {labelOf(SPECIALTIES, s)}
              </Badge>
            ))}
            {pro.genres.slice(0, 3).map((g) => (
              <Badge
                key={g}
                variant="outline"
                className="text-[11px]"
                style={{ borderColor: `${brand}55`, color: brand }}
              >
                {labelOf(GENRES, g)}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onRequestQuote?.(pro.id);
              }}
            >
              <MessageCircle className="ml-1.5 h-4 w-4" /> הצעת מחיר
            </Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); open(); }}>
              <Eye className="ml-1.5 h-4 w-4" /> פרופיל
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
