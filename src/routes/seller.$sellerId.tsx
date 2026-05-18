import { friendlyError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MapPin, Star, ShieldCheck, Pencil, Globe, Instagram, Youtube, ArrowRight, Building2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FollowButton } from "@/components/FollowButton";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/$sellerId")({
  head: () => ({ meta: [{ title: "פרופיל מוכר — המוזיקאי" }] }),
  component: SellerProfilePage,
});

function SellerProfilePage() {
  const { sellerId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [trusted, setTrusted] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: biz }, { data: trustedRow }, { data: list }, { data: revs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, username, avatar_url, banner_url, bio, created_at").eq("id", sellerId).maybeSingle(),
        supabase.from("marketplace_business_sellers").select("business_name").eq("user_id", sellerId).maybeSingle(),
        supabase.from("marketplace_trusted_sellers").select("user_id").eq("user_id", sellerId).maybeSingle(),
        supabase.from("marketplace_listings").select("id, title, price, images, status").eq("seller_id", sellerId).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("marketplace_reviews").select("id, rating, comment, created_at, reviewer_id").eq("seller_id", sellerId).order("created_at", { ascending: false }),
      ]);
      setProfile(prof);
      setBusiness(biz);
      setTrusted(!!trustedRow);
      setListings(list ?? []);
      setReviews(revs ?? []);
      if (user) {
        const mine = (revs ?? []).find((r: any) => r.reviewer_id === user.id);
        if (mine) {
          setMyReviewId(mine.id);
          setRating(mine.rating);
          setComment(mine.comment ?? "");
        }
      }
      setLoading(false);
    })();
  }, [sellerId, user]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submitReview = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (user.id === sellerId) { toast.error("לא ניתן לדרג את עצמך"); return; }
    setSubmitting(true);
    let error;
    if (myReviewId) {
      ({ error } = await supabase.from("marketplace_reviews").update({ rating, comment: comment.trim() || null }).eq("id", myReviewId));
    } else {
      ({ error } = await supabase.from("marketplace_reviews").insert({
        seller_id: sellerId, reviewer_id: user.id, rating, comment: comment.trim() || null,
      }));
    }
    setSubmitting(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(myReviewId ? "הדירוג עודכן!" : "תודה על הדירוג!");
    const { data: revs } = await supabase.from("marketplace_reviews").select("id, rating, comment, created_at, reviewer_id").eq("seller_id", sellerId).order("created_at", { ascending: false });
    setReviews(revs ?? []);
    const mine = (revs ?? []).find((r: any) => r.reviewer_id === user.id);
    if (mine) setMyReviewId(mine.id);
  };

  if (loading) return (
    <SiteLayout>
      <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </SiteLayout>
  );

  if (!profile) return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">המוכר לא נמצא</h1>
        <Link to="/marketplace"><Button>חזרה ללוח</Button></Link>
      </div>
    </SiteLayout>
  );

  const isOwner = user?.id === sellerId;
  const initials = (profile.display_name || "?").split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container mx-auto px-4 py-10 md:px-8 md:py-14">
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowRight className="h-4 w-4" /> חזרה ללוח
          </Link>
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-2 border-primary/40 shadow-gold">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl flex items-center gap-2 justify-center">
                {profile.display_name || "מוכר"}
                {trusted && <ShieldCheck className="h-6 w-6 text-primary" />}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                {business && <Badge variant="default" className="gap-1"><Building2 className="h-3 w-3" /> {business.business_name}</Badge>}
                {trusted && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />נבחרת המוזיקאי</Badge>}
                {avgRating > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {avgRating.toFixed(1)} ({reviews.length})
                  </Badge>
                )}
              </div>
              {profile.location && <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</p>}
              {profile.bio && <p className="mt-3 max-w-xl text-sm">{profile.bio}</p>}
              <div className="mt-3 flex justify-center gap-3 text-muted-foreground">
                {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Globe className="h-5 w-5" /></a>}
                {profile.instagram && <a href={`https://instagram.com/${profile.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Instagram className="h-5 w-5" /></a>}
                {profile.youtube && <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Youtube className="h-5 w-5" /></a>}
              </div>
              {isOwner ? (
                <div className="mt-4">
                  <Link to="/profile"><Button variant="outline" size="sm"><Pencil className="h-4 w-4" />ערוך פרופיל</Button></Link>
                </div>
              ) : (
                <div className="mt-4">
                  <FollowButton targetType="marketplace_seller" targetId={sellerId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">המודעות של {profile.display_name || "המוכר"} ({listings.length})</h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">אין מודעות פעילות.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <Link key={l.id} to="/marketplace/$listingId" params={{ listingId: l.id }} className="rounded-2xl border bg-card-elevated overflow-hidden hover:border-primary/50 transition">
                  <div className="aspect-square bg-muted">
                    {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm line-clamp-1">{l.title}</div>
                    <div className="text-primary font-bold mt-1">₪{Number(l.price).toLocaleString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold mb-4">דירוגים ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין אין דירוגים למוכר זה.</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 10).map((r) => (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((n) => <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-primary text-primary" : "text-muted"}`} />)}
                  </div>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {!isOwner && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="text-sm font-medium">{myReviewId ? "ערוך את הדירוג שלך" : "דרג את המוכר"}</div>
              {!user ? (
                <div className="text-sm">
                  <Link to="/auth" className="text-primary hover:underline">התחבר כדי לדרג</Link>
                </div>
              ) : (
                <>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setRating(n)} type="button">
                        <Star className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="תגובה (אופציונלי)" rows={2} />
                  <Button size="sm" onClick={submitReview} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {myReviewId ? "עדכן דירוג" : "שלח דירוג"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

