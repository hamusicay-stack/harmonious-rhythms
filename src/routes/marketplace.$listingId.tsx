import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Phone, MessageCircle, Share2, MapPin, ShieldCheck, Star, Loader2, Heart, Flame, Images, BadgeCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/marketplaceData";
import { ImageLightbox } from "@/components/marketplace/ImageLightbox";
import { ReportListingDialog } from "@/components/marketplace/ReportListingDialog";

export const Route = createFileRoute("/marketplace/$listingId")({
  component: ListingDetailPage,
});

function ListingDetailPage() {
  const { listingId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [trusted, setTrusted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [sellerListingsCount, setSellerListingsCount] = useState(0);
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("marketplace_listings").select("*").eq("id", listingId).maybeSingle();
      if (!l) { setLoading(false); return; }
      setListing(l);

      const [{ data: prof }, { data: trustedRow }, { data: revs }, { count }, { data: sim }, { count: likesC }, { data: myLike }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").eq("id", l.seller_id).maybeSingle(),
        supabase.from("marketplace_trusted_sellers").select("user_id").eq("user_id", l.seller_id).maybeSingle(),
        supabase.from("marketplace_reviews").select("id, rating, comment, created_at, reviewer_id").eq("seller_id", l.seller_id).order("created_at", { ascending: false }),
        supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("seller_id", l.seller_id).eq("status", "approved"),
        supabase.from("marketplace_listings").select("id, title, price, images, brand, model").eq("category", l.category).eq("status", "approved").neq("id", l.id).limit(4),
        supabase.from("marketplace_likes").select("id", { count: "exact", head: true }).eq("listing_id", l.id),
        user ? supabase.from("marketplace_likes").select("id").eq("listing_id", l.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setSeller(prof);
      setTrusted(!!trustedRow);
      setReviews(revs ?? []);
      setSellerListingsCount(count ?? 0);
      setSimilar(sim ?? []);
      setLikesCount(likesC ?? 0);
      setHasLiked(!!myLike);
      setLoading(false);
    })();
  }, [listingId, user]);

  const toggleLike = async () => {
    if (!user) { toast.error("יש להתחבר כדי לסמן לייק"); return; }
    if (likeBusy) return;
    setLikeBusy(true);
    if (hasLiked) {
      const { error } = await supabase.from("marketplace_likes").delete().eq("listing_id", listingId).eq("user_id", user.id);
      if (!error) { setHasLiked(false); setLikesCount((c) => Math.max(0, c - 1)); }
      else toast.error(error.message);
    } else {
      const { error } = await supabase.from("marketplace_likes").insert({ listing_id: listingId, user_id: user.id });
      if (!error) { setHasLiked(true); setLikesCount((c) => c + 1); }
      else toast.error(error.message);
    }
    setLikeBusy(false);
  };

  if (loading) return <ModulePlaceholder icon={Loader2} title="טוען..." subtitle=""><div /></ModulePlaceholder>;
  if (!listing) return (
    <ModulePlaceholder icon={ArrowRight} title="המודעה לא נמצאה" subtitle="">
      <Link to="/marketplace"><Button>חזרה ללוח</Button></Link>
    </ModulePlaceholder>
  );

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const waNumber = (listing.whatsapp || listing.phone || "").replace(/\D/g, "").replace(/^0/, "972");
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`היי, ראיתי את המודעה "${listing.title}" באתר המוזיקאי`)}`;

  const submitReview = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (user.id === listing.seller_id) { toast.error("לא ניתן לדרג את עצמך"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("marketplace_reviews").insert({
      seller_id: listing.seller_id, reviewer_id: user.id, listing_id: listing.id, rating, comment: comment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "כבר דירגת מוכר זה במודעה הזו" : error.message); return; }
    toast.success("תודה על הדירוג!");
    setComment("");
    const { data: revs } = await supabase.from("marketplace_reviews").select("id, rating, comment, created_at, reviewer_id").eq("seller_id", listing.seller_id).order("created_at", { ascending: false });
    setReviews(revs ?? []);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("הקישור הועתק");
    }
  };

  const isOwner = user?.id === listing.seller_id;

  return (
    <ModulePlaceholder icon={ArrowRight} title={listing.title} subtitle={CATEGORY_LABELS[listing.category] || listing.category}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="h-4 w-4" />חזרה ללוח
          </Link>
          {/* Edit removed — owner can only delete via profile page */}
        </div>
        {listing.is_urgent && (
          <div className="mb-4 rounded-xl border-2 border-rose-500/60 bg-rose-500/10 p-3 flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500" />
            <span className="font-semibold text-rose-600 dark:text-rose-400">מכירה דחופה — המוכר רוצה למכור מהר</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            {/* Gallery */}
            {listing.images?.length > 0 && (
              <div className="relative">
                <Carousel className="rounded-2xl overflow-hidden border bg-black/5">
                  <CarouselContent>
                    {listing.images.map((url: string, i: number) => (
                      <CarouselItem key={i}>
                        <div className="flex items-center justify-center bg-black/5 cursor-zoom-in" style={{ minHeight: "60vh" }} onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                          <img src={url} alt={`${listing.title} ${i + 1}`} className="max-h-[70vh] w-full object-contain" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {listing.images.length > 1 && <><CarouselPrevious /><CarouselNext /></>}
                </Carousel>
                <Button size="sm" variant="secondary" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }} className="absolute bottom-3 right-3 gap-1 shadow-lg">
                  <Images className="h-4 w-4" />כל התמונות ({listing.images.length})
                </Button>
              </div>
            )}
            <ImageLightbox images={listing.images ?? []} open={lightboxOpen} initialIndex={lightboxIndex} onOpenChange={setLightboxOpen} alt={listing.title} />

            {/* Audio sample */}
            {listing.audio_url && (
              <div className="rounded-2xl overflow-hidden border bg-card p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">🎵 השמעה של הכלי</h3>
                <audio src={listing.audio_url} controls className="w-full" />
              </div>
            )}

            {/* Video */}
            {listing.video_url && (
              <div className="rounded-2xl overflow-hidden border bg-card p-4">
                <h3 className="font-semibold mb-3">סרטון של הכלי</h3>
                {listing.video_url.includes("youtube") || listing.video_url.includes("youtu.be") ? (
                  <iframe className="w-full aspect-video rounded-lg" src={listing.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")} allowFullScreen />
                ) : (
                  <video src={listing.video_url} controls className="w-full rounded-lg max-h-96" />
                )}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="font-semibold mb-3">תיאור</h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Specs */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold mb-3">מפרט טכני</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {listing.brand && <><dt className="text-muted-foreground">מותג</dt><dd>{listing.brand}</dd></>}
                {listing.model && <><dt className="text-muted-foreground">דגם</dt><dd>{listing.model}</dd></>}
                {listing.specs?.year && <><dt className="text-muted-foreground">שנה</dt><dd>{listing.specs.year}</dd></>}
                <dt className="text-muted-foreground">מצב</dt><dd>{CONDITION_LABELS[listing.item_condition]}</dd>
                {listing.specs?.has_rhythms && <><dt className="text-muted-foreground">מקצבים</dt><dd>כן</dd></>}
                {listing.specs?.has_samples && <><dt className="text-muted-foreground">דגימות</dt><dd>כן</dd></>}
              </dl>
            </div>

            {/* Reviews */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">דירוגי המוכר ({reviews.length})</h3>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-bold">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">עדיין אין דירוגים למוכר זה.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="border-b pb-3 last:border-0">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map((n) => <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-primary text-primary" : "text-muted"}`} />)}
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {user && user.id !== listing.seller_id && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="text-sm font-medium">דרג את המוכר</div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setRating(n)} type="button">
                        <Star className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="תגובה (אופציונלי)" rows={2} />
                  <Button size="sm" onClick={submitReview} disabled={submittingReview}>שלח דירוג</Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-2xl border bg-card-elevated p-5 space-y-4">
              <div className="text-3xl font-bold text-primary">₪{Number(listing.price).toLocaleString()}</div>
              {(listing.city || listing.region) && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" />{[listing.city, listing.region].filter(Boolean).join(", ")}</div>}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{CONDITION_LABELS[listing.item_condition] || listing.item_condition}</Badge>
                {listing.seller_type === "business" && <Badge variant="default">מוכר עסקי</Badge>}
              </div>

              <div className={`grid gap-2 pt-2 ${listing.whatsapp ? "grid-cols-2" : "grid-cols-1"}`}>
                <a href={`tel:${listing.phone}`}><Button className="w-full" size="sm"><Phone className="h-4 w-4" />חיוג</Button></a>
                {listing.whatsapp && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full" size="sm"><MessageCircle className="h-4 w-4" />וואטסאפ</Button>
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={hasLiked ? "default" : "outline"}
                  size="sm"
                  onClick={toggleLike}
                  disabled={likeBusy}
                  className={hasLiked ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                >
                  <Heart className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                  {hasLiked ? "אהבתי" : "סמן לייק"} {likesCount > 0 && `(${likesCount})`}
                </Button>
                <Button variant="ghost" size="sm" onClick={share}><Share2 className="h-4 w-4" />שתף</Button>
              </div>
              {!isOwner && (
                <div className="pt-2 border-t flex justify-center">
                  <ReportListingDialog listingId={listing.id} />
                </div>
              )}
            </div>

            {seller && (
              <Link to="/seller/$sellerId" params={{ sellerId: listing.seller_id }} className="block rounded-2xl border bg-card p-5 space-y-3 hover:border-primary/50 transition">
                <div className="flex items-center gap-3">
                  {seller.avatar_url ? <img src={seller.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-muted" />}
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-1">
                      {seller.display_name || "מוכר"}
                      {trusted && <ShieldCheck className="h-4 w-4 text-primary" />}
                    </div>
                    {trusted && <Badge variant="secondary" className="mt-1 gap-1"><ShieldCheck className="h-3 w-3" />נבחרת המוזיקאי</Badge>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{sellerListingsCount} מודעות פעילות</div>
                  {avgRating > 0 && <div className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />דירוג: {avgRating.toFixed(1)} ({reviews.length})</div>}
                </div>
                <div className="text-xs text-primary font-medium">צפה בכל המודעות של המוכר ←</div>
              </Link>
            )}
          </aside>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-10">
            <h3 className="font-semibold mb-4">מודעות דומות</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => (
                <Link key={s.id} to="/marketplace/$listingId" params={{ listingId: s.id }} className="rounded-xl border bg-card overflow-hidden hover:border-primary/50 transition">
                  <div className="aspect-square bg-muted">
                    {s.images?.[0] && <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium line-clamp-1">{s.title}</div>
                    <div className="text-primary font-bold text-sm mt-1">₪{Number(s.price).toLocaleString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModulePlaceholder>
  );
}
