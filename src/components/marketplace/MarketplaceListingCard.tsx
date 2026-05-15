import { Link } from "@tanstack/react-router";
import { useState, MouseEvent } from "react";
import { MapPin, Briefcase, BadgeCheck, ArrowUp, Flame, Heart, Eye, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { QuickViewDialog } from "./QuickViewDialog";
import { ChatThreadDialog } from "./ChatThreadDialog";
import { useListingLike } from "@/hooks/useListingLike";

export type CardListing = {
  id: string;
  seller_id: string;
  title: string;
  brand: string | null;
  model: string | null;
  item_condition?: string;
  price: number;
  region: string | null;
  city: string | null;
  images: string[] | null;
  seller_type: string;
  bump_expires_at: string | null;
  is_urgent?: boolean;
  audio_url?: string | null;
};

interface Props {
  listing: CardListing;
  variant?: "grid" | "list";
  isBusiness: boolean;
  isTrusted: boolean;
}

const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

// Privacy Shield: cards never expose seller phone/whatsapp.
// Buyers must use the secure in-app chat (ChatThreadDialog).

export function MarketplaceListingCard({ listing, variant = "grid", isBusiness, isTrusted }: Props) {
  const { user } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const { liked, toggle } = useListingLike(listing.id);
  const images = listing.images?.length ? listing.images : [];
  const bumped = listing.bump_expires_at && new Date(listing.bump_expires_at) > new Date();

  const toggleLike = async (e: MouseEvent) => {
    stop(e);
    if (!user) { toast.error("יש להתחבר כדי לשמור מועדפים"); return; }
    const r = await toggle();
    if (!r.ok && r.reason === "error") toast.error("הפעולה נכשלה");
  };

  const openQuickView = (e: MouseEvent) => { stop(e); setQuickOpen(true); };
  const nextImg = (e: MouseEvent) => { stop(e); setImgIdx((i) => (i + 1) % images.length); };
  const prevImg = (e: MouseEvent) => { stop(e); setImgIdx((i) => (i - 1 + images.length) % images.length); };

  const urgentRing = listing.is_urgent ? "border-rose-500/70 urgent-pulse" : bumped ? "border-primary/60 ring-1 ring-primary/20" : "border-border/40";

  // Business listing styling — subtle but premium gold-tinted background and elegant border
  const businessAccent = isBusiness && !listing.is_urgent && !bumped
    ? "border-amber-500/40 bg-gradient-to-br from-amber-50/50 to-card-elevated dark:from-amber-950/10 dark:to-card-elevated ring-1 ring-amber-500/10"
    : "";

  // Touch swipe gesture state for Insta-style image gallery on mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || images.length <= 1) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 40) {
      // RTL-aware: swipe left = next, swipe right = prev
      setImgIdx((i) => diff < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length);
    }
    setTouchStart(null);
  };

  // ---- LIST VARIANT ----
  if (variant === "list") {
    return (
      <>
        <Link to="/marketplace/$listingId" params={{ listingId: listing.id }} className="group block">
          <article className={`rounded-3xl border bg-card-elevated overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex gap-4 ${urgentRing} ${businessAccent}`}>
            <div className="relative w-32 sm:w-44 shrink-0 aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden">
              {images[0] ? (
                <img src={images[0]} alt={listing.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">אין תמונה</div>
              )}
              {listing.is_urgent && (
                <Badge className="absolute top-2 right-2 gap-1 shadow-lg bg-rose-500 hover:bg-rose-600 text-[10px]"><Flame className="h-3 w-3" />דחוף</Badge>
              )}
            </div>
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {listing.brand && <div className="font-bold text-base">{listing.brand}</div>}
                    <h3 className="text-sm text-muted-foreground line-clamp-2">{listing.model || listing.title}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={isBusiness ? "default" : "secondary"} className="gap-1 text-[10px]">
                      {isBusiness ? <><Briefcase className="h-3 w-3" />עסקי</> : "פרטי"}
                    </Badge>
                    {isTrusted && (
                      <Badge variant="secondary" className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"><BadgeCheck className="h-3 w-3" />מאומת</Badge>
                    )}
                    {bumped && <Badge className="gap-1 text-[10px] bg-amber-500 hover:bg-amber-600 text-white"><ArrowUp className="h-3 w-3" />ממומן</Badge>}
                  </div>
                </div>
                {listing.audio_url && <Badge variant="secondary" className="gap-1 text-[10px]">🎵 השמעה</Badge>}
              </div>
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40">
                <div className="font-display font-bold text-2xl text-gradient-gold">₪{Number(listing.price).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <div onClick={stop}>
                    <ChatThreadDialog
                      listingId={listing.id}
                      sellerId={listing.seller_id}
                      listingTitle={listing.title}
                      trigger={
                        <button type="button" className="rounded-full p-2 bg-primary/10 hover:bg-primary/20 text-primary transition" title="צ'אט מאובטח עם המוכר">
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      }
                    />
                  </div>
                  <button type="button" onClick={toggleLike} className={`rounded-full p-2 transition ${liked ? "bg-rose-500/15 text-rose-500" : "bg-muted hover:bg-rose-500/10 hover:text-rose-500"}`} title="מועדפים">
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                  </button>
                  {(listing.city || listing.region) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                      <MapPin className="h-3 w-3" />{listing.city || listing.region}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        </Link>
        <QuickViewDialog listing={listing} open={quickOpen} onOpenChange={setQuickOpen} />
      </>
    );
  }

  // ---- GRID VARIANT (Bento) ----
  return (
    <>
      <Link to="/marketplace/$listingId" params={{ listingId: listing.id }} className="group block">
        <article className={`relative rounded-3xl border bg-card-elevated overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${urgentRing} ${businessAccent}`}>
          {/* Image area with internal carousel + touch swipe (Insta-style) */}
          <div
            className="relative aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {images.length > 0 ? (
              images.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={listing.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === imgIdx ? "opacity-100" : "opacity-0"}`}
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">אין תמונה</div>
            )}

            {/* Carousel arrows (desktop hover) */}
            {images.length > 1 && (
              <>
                <button type="button" onClick={prevImg} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-background">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={nextImg} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-background">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white w-4" : "bg-white/50 w-1.5"}`} />
                  ))}
                </div>
              </>
            )}

            {/* Floating badges - top right (seller type) */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              <Badge variant={isBusiness ? "default" : "secondary"} className="gap-1 text-[10px] shadow-md backdrop-blur">
                {isBusiness ? <><Briefcase className="h-3 w-3" />עסקי</> : "פרטי"}
              </Badge>
              {isTrusted && (
                <Badge variant="secondary" className="gap-1 text-[10px] shadow-md backdrop-blur bg-emerald-500/90 text-white"><BadgeCheck className="h-3 w-3" />מאומת</Badge>
              )}
            </div>

            {/* Floating badges - top left (urgent / sponsored) */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {listing.is_urgent && (
                <Badge className="gap-1 shadow-lg bg-rose-500 hover:bg-rose-600 text-[10px]"><Flame className="h-3 w-3" />דחוף</Badge>
              )}
              {bumped && (
                <Badge className="gap-1 shadow-lg text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                  <ArrowUp className="h-3 w-3" />ממומן
                </Badge>
              )}
            </div>

            {/* Quick actions - bottom (always on mobile, hover on desktop) */}
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
              <button type="button" onClick={openWa} className="h-8 w-8 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition" title="וואטסאפ">
                <MessageCircle className="h-4 w-4" />
              </button>
              <div onClick={stop}>
                <ChatThreadDialog
                  listingId={listing.id}
                  sellerId={listing.seller_id}
                  listingTitle={listing.title}
                  trigger={
                    <button type="button" className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition" title="צ'אט עם המוכר">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
              <button type="button" onClick={toggleLike} className={`h-8 w-8 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition ${liked ? "bg-rose-500 text-white" : "bg-background/90 backdrop-blur"}`} title="מועדפים">
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              </button>
              <button type="button" onClick={openQuickView} className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-lg flex items-center justify-center hover:scale-110 transition" title="צפייה מהירה">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {listing.brand ? (
              <div>
                <div className="font-bold text-sm tracking-wide uppercase">{listing.brand}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{listing.model || listing.title}</div>
              </div>
            ) : (
              <h3 className="font-semibold text-sm line-clamp-2">{listing.title}</h3>
            )}

            <div className="flex items-end justify-between pt-1">
              <div className="font-display font-bold text-xl text-gradient-gold leading-none">
                ₪{Number(listing.price).toLocaleString()}
              </div>
              {(listing.city || listing.region) && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />{listing.city || listing.region}
                </div>
              )}
            </div>
            {listing.audio_url && (
              <Badge variant="secondary" className="gap-1 text-[10px]">🎵 השמעה</Badge>
            )}
          </div>
        </article>
      </Link>
      <QuickViewDialog listing={listing} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
