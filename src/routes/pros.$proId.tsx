import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck, Crown, MapPin, Phone, Globe, Instagram, Youtube,
  Play, MessageCircle, Star, Loader2, Pencil, ArrowRight, Check, X, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { labelOf, SPECIALTIES, GENRES, PACKAGE_UNITS } from "@/lib/prosData";
import { RequestQuoteDialog } from "@/components/pros/RequestQuoteDialog";
import { AddReviewDialog } from "@/components/pros/AddReviewDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/pros/$proId")({
  component: ProDetailPage,
});

type Pro = {
  id: string; user_id: string; display_name: string; headline: string | null; bio: string | null;
  profile_image: string | null; cover_image: string | null; brand_color: string | null;
  hourly_price_min: number | null; region: string | null; cities: string[]; specialties: string[];
  genres: string[]; gear_list: string[]; whatsapp: string | null; phone: string | null;
  instagram: string | null; youtube: string | null; website: string | null;
  is_verified: boolean; is_featured: boolean; subscription_tier: string; status: string;
};

type Media = { id: string; type: string; url: string; title: string | null; is_featured: boolean };
type Pkg = { id: string; title: string; description: string | null; price: number; unit: string };
type Review = { id: string; rating: number; comment: string | null; is_verified: boolean; created_at: string; reviewer_id: string };

function ProDetailPage() {
  const { proId } = Route.useParams();
  const { user } = useAuth();
  const { play } = useAudioPlayer();
  const navigate = useNavigate();
  const [pro, setPro] = useState<Pro | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: m }, { data: pk }, { data: rv }] = await Promise.all([
        supabase.from("music_pros").select("*").eq("id", proId).maybeSingle(),
        supabase.from("music_pro_media").select("*").eq("pro_id", proId).order("display_order"),
        supabase.from("music_pro_packages").select("*").eq("pro_id", proId).order("display_order"),
        supabase.from("music_pro_reviews").select("*").eq("pro_id", proId).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setPro(p as Pro | null);
      setMedia((m as Media[]) ?? []);
      setPackages((pk as Pkg[]) ?? []);
      setReviews((rv as Review[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [proId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">המוזיקאי לא נמצא</h1>
        <Link to="/pros" className="mt-4 inline-block text-primary hover:underline">חזרה לאינדקס</Link>
      </div>
    );
  }

  const brand = pro.brand_color || "#D4A24E";
  const isVip = pro.subscription_tier === "vip";
  const audios = media.filter((m) => m.type === "audio");
  const videos = media.filter((m) => m.type === "video");
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isOwner = user?.id === pro.user_id;

  return (
    <div className="text-right">
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden md:h-72" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}40)` }}>
        {pro.cover_image && (
          <img src={pro.cover_image} alt="" className="h-full w-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-8">
        <div className="relative -mt-16 grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Main */}
          <div>
            <div className="flex items-end gap-4">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-background bg-muted shadow-2xl">
                {pro.profile_image ? (
                  <img src={pro.profile_image} alt={pro.display_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-muted-foreground">
                    {pro.display_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {isVip && (
                    <Badge className="border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-400 text-white">
                      <Crown className="ml-1 h-3 w-3" /> VIP
                    </Badge>
                  )}
                  {pro.is_verified && (
                    <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300">
                      <ShieldCheck className="ml-1 h-3 w-3" /> מאומת
                    </Badge>
                  )}
                  {isOwner && (
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/pros/$proId/edit", params: { proId: pro.id } })}>
                      <Pencil className="ml-1 h-3.5 w-3.5" /> ערוך
                    </Button>
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold md:text-3xl">{pro.display_name}</h1>
                {pro.headline && <p className="text-muted-foreground">{pro.headline}</p>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {(pro.cities[0] || pro.region) && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{pro.cities[0] || pro.region}</span>
              )}
              {avg > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <strong className="text-foreground">{avg.toFixed(1)}</strong> ({reviews.length})
                </span>
              )}
              {pro.specialties.map((s) => (
                <Badge key={s} variant="outline">{labelOf(SPECIALTIES, s)}</Badge>
              ))}
            </div>

            <Tabs defaultValue="showreel" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="showreel">Showreel</TabsTrigger>
                <TabsTrigger value="services">שירותים</TabsTrigger>
                <TabsTrigger value="gear">ציוד</TabsTrigger>
                <TabsTrigger value="reviews">ביקורות</TabsTrigger>
              </TabsList>

              <TabsContent value="showreel" className="mt-4 space-y-4">
                {pro.bio && <p className="text-sm leading-relaxed text-muted-foreground">{pro.bio}</p>}
                {audios.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="mb-3 font-semibold">דמו אודיו</h3>
                      <div className="space-y-2">
                        {audios.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => play({ id: a.id, url: a.url, title: a.title || "טראק", artist: pro.display_name, proId: pro.id })}
                            className="group flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-right transition-colors hover:border-primary/40 hover:bg-secondary/40"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                              <Play className="h-4 w-4" />
                            </div>
                            <span className="flex-1 truncate text-sm font-medium">{a.title || "טראק"}</span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {videos.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="mb-3 font-semibold">וידאו</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {videos.map((v) => (
                          <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-border/60">
                            <div className="aspect-video bg-muted">
                              {v.url.includes("youtube") || v.url.includes("youtu.be") ? (
                                <iframe
                                  src={v.url.replace("watch?v=", "embed/")}
                                  className="h-full w-full"
                                  allowFullScreen
                                  title={v.title || "video"}
                                />
                              ) : (
                                <video src={v.url} controls className="h-full w-full object-cover" />
                              )}
                            </div>
                            {v.title && <p className="p-2 text-sm">{v.title}</p>}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {audios.length === 0 && videos.length === 0 && (
                  <p className="text-sm text-muted-foreground">עדיין לא הועלו דוגמאות.</p>
                )}
                {pro.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pro.genres.map((g) => (
                      <Badge key={g} variant="outline" style={{ borderColor: `${brand}55`, color: brand }}>
                        {labelOf(GENRES, g)}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                {packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">לא הוגדרו חבילות מחיר.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {packages.map((p) => (
                      <Card key={p.id}>
                        <CardContent className="p-4">
                          <h4 className="font-display font-bold">{p.title}</h4>
                          {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="font-display text-2xl font-bold text-gradient-gold">
                              ₪{Number(p.price).toLocaleString("he-IL")}
                            </span>
                            <span className="text-xs text-muted-foreground">{labelOf(PACKAGE_UNITS, p.unit)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gear" className="mt-4">
                {pro.gear_list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">לא צוינו פרטי ציוד.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pro.gear_list.map((g, i) => (
                      <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm">{g}</Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-4 space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין עדיין ביקורות.</p>
                ) : (
                  reviews.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                            ))}
                          </div>
                          {r.is_verified && (
                            <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-300">
                              <ShieldCheck className="ml-1 h-3 w-3" /> מאומת
                            </Badge>
                          )}
                        </div>
                        {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("he-IL")}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="md:sticky md:top-20 md:self-start">
            <Card className="border-2" style={{ borderColor: `${brand}40` }}>
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-bold">צור קשר</h3>
                {pro.hourly_price_min != null && pro.hourly_price_min > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    החל מ-<strong className="text-gradient-gold">₪{Number(pro.hourly_price_min).toLocaleString("he-IL")}</strong>
                  </p>
                )}

                <Button
                  className="mt-4 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
                  size="lg"
                  onClick={() => setQuoteOpen(true)}
                >
                  <MessageCircle className="ml-2 h-4 w-4" /> שלח בקשת הצעת מחיר
                </Button>

                {pro.whatsapp && (
                  <a
                    href={`https://wa.me/${pro.whatsapp.replace(/\D/g, "").replace(/^0/, "972")}?text=${encodeURIComponent(`היי ${pro.display_name}, ראיתי את הפרופיל שלך באתר המוזיקאי`)}`}
                    target="_blank" rel="noreferrer"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-300"
                  >
                    <MessageCircle className="h-4 w-4" /> וואטסאפ
                  </a>
                )}

                {(pro.phone || pro.instagram || pro.youtube || pro.website) && (
                  <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                    {pro.phone && (
                      <a href={`tel:${pro.phone}`} dir="ltr" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Phone className="h-4 w-4" /> {pro.phone}
                      </a>
                    )}
                    {pro.instagram && (
                      <a href={pro.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Instagram className="h-4 w-4" /> Instagram
                      </a>
                    )}
                    {pro.youtube && (
                      <a href={pro.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Youtube className="h-4 w-4" /> YouTube
                      </a>
                    )}
                    {pro.website && (
                      <a href={pro.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                        <Globe className="h-4 w-4" /> אתר
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Link to="/pros" className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowRight className="h-3.5 w-3.5" /> חזרה לאינדקס
            </Link>
          </aside>
        </div>
      </div>

      <div className="h-16" />

      <RequestQuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} proId={pro.id} proName={pro.display_name} />
    </div>
  );
}
