import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, ShieldCheck, Crown, Play, MessageCircle, Pencil } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { labelOf, SPECIALTIES, GENRES } from "@/lib/prosData";
import type { ProCardData } from "./ProCard";

type Props = {
  pro: ProCardData;
  onRequestQuote?: (proId: string) => void;
};

export function ProListItem({ pro, onRequestQuote }: Props) {
  const navigate = useNavigate();
  const { play } = useAudioPlayer();
  const { user } = useAuth();
  const isOwner = user?.id === pro.user_id;
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
    return () => { cancelled = true; };
  }, [pro.id]);

  const brand = pro.brand_color || "#D4A24E";
  const isVip = pro.subscription_tier === "vip";
  const open = () => navigate({ to: "/pros/$proId", params: { proId: pro.id } });

  const onPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewTrack) return;
    play({ id: pro.id, url: previewTrack.url, title: previewTrack.title, artist: pro.display_name, proId: pro.id });
  };

  return (
    <div
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border/40 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
        {pro.profile_image ? (
          <img src={pro.profile_image} alt={pro.display_name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-display text-2xl font-bold"
            style={{ background: `linear-gradient(135deg, ${brand}40, ${brand}10)`, color: brand }}
          >
            {pro.display_name.charAt(0)}
          </div>
        )}
        {previewTrack && (
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="נגן"
          >
            <Play className="h-7 w-7 text-white" />
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1 text-right">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {isVip && (
            <Badge className="border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-400 text-white">
              <Crown className="ml-1 h-3 w-3" />VIP
            </Badge>
          )}
          {pro.is_verified && (
            <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300">
              <ShieldCheck className="ml-1 h-3 w-3" />מאומת
            </Badge>
          )}
          <h3 className="font-display text-base font-bold sm:text-lg">{pro.display_name}</h3>
        </div>
        {pro.headline && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:text-sm">{pro.headline}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {rating.count > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{rating.avg.toFixed(1)}</span>
              <span>({rating.count})</span>
            </span>
          )}
          {(pro.cities[0] || pro.region) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />{pro.cities[0] || pro.region}
            </span>
          )}
          {pro.specialties.slice(0, 1).map((s) => (
            <span key={s}>· {labelOf(SPECIALTIES, s)}</span>
          ))}
          {pro.hourly_price_min != null && pro.hourly_price_min > 0 && (
            <span>· החל מ-<strong className="text-gradient-gold">₪{Number(pro.hourly_price_min).toLocaleString("he-IL")}</strong></span>
          )}
        </div>
        <div className="mt-1.5 hidden flex-wrap gap-1 sm:flex">
          {pro.genres.slice(0, 4).map((g) => (
            <Badge key={g} variant="outline" className="text-[10px]" style={{ borderColor: `${brand}55`, color: brand }}>
              {labelOf(GENRES, g)}
            </Badge>
          ))}
        </div>
      </div>

      {isOwner ? (
        <Button
          size="sm"
          className="shrink-0"
          onClick={(e) => { e.stopPropagation(); navigate({ to: "/pros/$proId/edit", params: { proId: pro.id } }); }}
        >
          <Pencil className="ml-1.5 h-4 w-4" />ערוך
        </Button>
      ) : (
        <Button
          size="sm"
          className="shrink-0"
          onClick={(e) => { e.stopPropagation(); onRequestQuote?.(pro.id); }}
        >
          <MessageCircle className="ml-1.5 h-4 w-4" />הצעה
        </Button>
      )}
    </div>
  );
}
