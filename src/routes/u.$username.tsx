import { createFileRoute, Link, ErrorComponent, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { getPublicProfile } from "@/lib/publicProfile.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Globe, Instagram, Youtube, ShieldCheck, Crown, Star, MessageSquare, Video, Tag, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const profileQO = (username: string) =>
  queryOptions({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicProfile({ data: { username } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/u/$username")({
  loader: ({ params, context }) =>
    (context as { queryClient?: { ensureQueryData: (o: unknown) => Promise<unknown> } }).queryClient?.ensureQueryData(profileQO(params.username)),
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — המוזיקאי` },
      { name: "description", content: `הפרופיל הציבורי של ${params.username} בקהילת המוזיקאי` },
      { property: "og:title", content: `@${params.username} — המוזיקאי` },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div dir="rtl" className="container mx-auto px-4 py-12 text-center">
          <ErrorComponent error={error} />
          <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 underline">נסה שוב</button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-12 text-center text-muted-foreground">המשתמש לא נמצא</div>
    </SiteLayout>
  ),
  component: PublicProfilePage,
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    active: { label: "פעיל", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: <ShieldCheck className="h-3 w-3" /> },
    suspended: { label: "מושעה", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    banned: { label: "חסום", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    pending: { label: "ממתין", cls: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[status] ?? map.pending;
  return <Badge variant="outline" className={`gap-1 ${v.cls}`}>{v.icon}{v.label}</Badge>;
}

function Empty({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Icon className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { data } = useSuspenseQuery(profileQO(username));

  if (!data?.profile) {
    return (
      <SiteLayout>
        <div dir="rtl" className="container mx-auto px-4 py-12 text-center text-muted-foreground">המשתמש לא נמצא</div>
      </SiteLayout>
    );
  }

  const p = data.profile;
  const tier = data.tier;

  if ("restricted" in p && p.restricted) {
    return (
      <SiteLayout>
        <div dir="rtl" className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">{p.display_name ?? p.username}</h1>
          <StatusBadge status={p.global_status} />
          <p className="text-muted-foreground mt-4">פרופיל זה אינו זמין לצפייה ציבורית כעת.</p>
        </div>
      </SiteLayout>
    );
  }

  const initials = (p.display_name ?? p.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <SiteLayout>
      <div dir="rtl" className="min-h-screen">
        {/* Banner */}
        <div className="relative h-40 sm:h-56 bg-gradient-to-br from-primary/20 via-accent/10 to-background border-b border-border">
          {p.banner_url && <img src={p.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </div>

        <div className="container mx-auto px-4">
          {/* Header card */}
          <Card className="-mt-16 sm:-mt-20 relative z-10 shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-end">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background ring-2 ring-primary/30">
                  <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name ?? p.username ?? ""} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">{p.display_name ?? p.username}</h1>
                    <StatusBadge status={p.global_status} />
                    {tier?.is_vip && (
                      <Badge variant="outline" className="gap-1 bg-purple-500/15 text-purple-300 border-purple-500/30">
                        <Crown className="h-3 w-3" />{tier.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">@{p.username}</p>
                  {p.bio && <p className="mt-3 text-sm sm:text-base whitespace-pre-wrap">{p.bio}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
                    {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Globe className="h-3 w-3" />אתר</a>}
                    {p.instagram && <a href={`https://instagram.com/${p.instagram.replace("@","")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Instagram className="h-3 w-3" />Instagram</a>}
                    {p.youtube && <a href={p.youtube} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Youtube className="h-3 w-3" />YouTube</a>}
                    <span>הצטרף {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: he })}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />{p.forum_reputation} מוניטין</Badge>
                    <Badge variant="secondary" className="gap-1"><MessageSquare className="h-3 w-3" />{p.forum_post_count} הודעות</Badge>
                    <Badge variant="outline">{p.forum_rank}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="forum" className="mt-6">
            <TabsList className="w-full sm:w-auto flex-wrap h-auto">
              <TabsTrigger value="forum"><MessageSquare className="h-4 w-4 ml-1" />קהילה ({data.topics.length + data.posts.length})</TabsTrigger>
              <TabsTrigger value="listings"><Tag className="h-4 w-4 ml-1" />יד 2 ({data.listings.length})</TabsTrigger>
              <TabsTrigger value="shorts"><Video className="h-4 w-4 ml-1" />שורטס ({data.shorts.length})</TabsTrigger>
              <TabsTrigger value="pro"><Briefcase className="h-4 w-4 ml-1" />כרטיס מקצועי</TabsTrigger>
            </TabsList>

            <TabsContent value="forum" className="mt-4 space-y-6">
              <section>
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">אשכולות שנפתחו</h3>
                {data.topics.length === 0 ? <Empty icon={MessageSquare} label={`@${p.username} עדיין לא פתח/ה אשכולות בפורום`} /> : (
                  <div className="space-y-1.5">
                    {data.topics.map((t) => (
                      <Link key={t.id} to="/forum/topic/$slug" params={{ slug: t.slug }} className="block px-3 py-2.5 rounded-lg border border-border hover:bg-accent/40 transition-colors">
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.reply_count} תגובות · {t.view_count} צפיות</div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">תגובות אחרונות</h3>
                {data.posts.length === 0 ? <Empty icon={MessageSquare} label={`@${p.username} עדיין לא הגיב/ה בפורום`} /> : (
                  <div className="space-y-2">
                    {data.posts.map((po) => {
                      const topic = (po as { topic?: { title?: string; slug?: string } }).topic;
                      return (
                        <Link key={po.id} to="/forum/topic/$slug" params={{ slug: topic?.slug ?? "" }} className="block rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors">
                          <div className="text-sm font-medium">{topic?.title ?? "אשכול"}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{po.body_md}</div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="listings" className="mt-4">
              {data.listings.length === 0 ? (
                <Empty icon={Tag} label={`ל@${p.username} אין מודעות פעילות ביד 2`} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {data.listings.map((l) => (
                    <Link key={l.id} to="/marketplace/$listingId" params={{ listingId: l.id }} className="group">
                      <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full">
                        <div className="aspect-square bg-muted overflow-hidden">
                          {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{l.title}</p>
                          <p className="text-sm font-bold mt-1 text-primary">{Number(l.price).toLocaleString("he-IL")} ₪</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="shorts" className="mt-4">
              {data.shorts.length === 0 ? (
                <Empty icon={Video} label={`@${p.username} עדיין לא העלה/תה סרטוני שורטס`} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.shorts.map((s) => (
                    <Link key={s.id} to="/shorts" search={{ v: s.id } as never} className="group">
                      <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                        <div className="aspect-[9/16] bg-muted relative overflow-hidden">
                          {s.thumbnail_url && <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover" />}
                          <div className="absolute bottom-1 left-1 text-xs text-white bg-black/60 rounded px-1.5">{s.views_count} צפיות</div>
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs line-clamp-2">{s.title}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pro" className="mt-4">
              {!data.musicPro ? (
                <Empty icon={Briefcase} label={`ל@${p.username} אין עדיין כרטיס באינדקס המקצועי`} />
              ) : (
                <Link to="/pros/$proId" params={{ proId: data.musicPro.id }} className="block">
                  <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                    {data.musicPro.cover_image && <div className="h-32 bg-muted overflow-hidden"><img src={data.musicPro.cover_image} alt="" className="w-full h-full object-cover" /></div>}
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {data.musicPro.profile_image && <img src={data.musicPro.profile_image} alt="" className="h-14 w-14 rounded-full object-cover" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{data.musicPro.display_name}</h4>
                            {data.musicPro.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                          </div>
                          {data.musicPro.headline && <p className="text-xs text-muted-foreground">{data.musicPro.headline}</p>}
                        </div>
                      </div>
                      {data.musicPro.bio && <p className="text-sm mt-3 line-clamp-3">{data.musicPro.bio}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(data.musicPro.specialties ?? []).slice(0, 5).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteLayout>
  );
}
