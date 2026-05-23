import { friendlyError } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Heart, Tags, ShoppingBag, Music2, GraduationCap, MessageSquare,
  Store, Trash2, Bell, Search, User as UserIcon,
} from "lucide-react";

// ---------- Liked Items ----------
type LikeRow = { item_type: string; item_id: string; created_at: string };

function LikedItems({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<"all" | "marketplace_listing" | "shop_product" | "music_pro" | "academy_course" | "forum_post" | "shorts_video">("all");
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [items, setItems] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: gLikes } = await supabase
      .from("user_likes")
      .select("item_type, item_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: legacy } = await supabase
      .from("marketplace_likes")
      .select("listing_id, created_at")
      .eq("user_id", userId);

    const allLikes: LikeRow[] = [
      ...((gLikes ?? []) as LikeRow[]),
      ...((legacy ?? []) as { listing_id: string; created_at: string }[]).map((l) => ({
        item_type: "marketplace_listing",
        item_id: l.listing_id,
        created_at: l.created_at,
      })),
    ];
    const seen = new Set<string>();
    const dedup = allLikes.filter((l) => {
      const k = `${l.item_type}:${l.item_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
    setLikes(dedup);

    const groups: Record<string, string[]> = {};
    for (const l of dedup) (groups[l.item_type] ||= []).push(l.item_id);

    const map: Record<string, any> = {};
    if (groups.marketplace_listing?.length) {
      const { data } = await supabase.from("marketplace_listings")
        .select("id, title, price, images, status").in("id", groups.marketplace_listing);
      for (const r of data ?? []) map[`marketplace_listing:${r.id}`] = r;
    }
    if (groups.shop_product?.length) {
      const { data } = await supabase.from("shop_products")
        .select("id, title, slug, price, sale_price, main_image").in("id", groups.shop_product);
      for (const r of data ?? []) map[`shop_product:${r.id}`] = r;
    }
    if (groups.music_pro?.length) {
      const { data } = await supabase.from("music_pros")
        .select("id, display_name, headline, profile_image").in("id", groups.music_pro);
      for (const r of data ?? []) map[`music_pro:${r.id}`] = r;
    }
    if (groups.forum_post?.length) {
      const { data } = await supabase.from("forum_posts")
        .select("id, body_md, topic_id").in("id", groups.forum_post);
      for (const r of (data ?? []) as Array<{ id: string; body_md: string; topic_id: string }>) {
        map[`forum_post:${r.id}`] = { id: r.id, title: r.body_md.slice(0, 60), content: r.body_md };
      }
    }
    if (groups.shorts_video?.length) {
      const { data } = await supabase.from("shorts_videos")
        .select("id, title, thumbnail_url, video_url").in("id", groups.shorts_video);
      for (const r of data ?? []) map[`shorts_video:${r.id}`] = r;
    }
    setItems(map);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const unlike = async (l: LikeRow) => {
    if (l.item_type === "marketplace_listing") {
      await supabase.from("user_likes").delete()
        .eq("user_id", userId).eq("item_type", l.item_type).eq("item_id", l.item_id);
      await supabase.from("marketplace_likes").delete()
        .eq("user_id", userId).eq("listing_id", l.item_id);
    } else {
      await supabase.from("user_likes").delete()
        .eq("user_id", userId).eq("item_type", l.item_type).eq("item_id", l.item_id);
    }
    setLikes((prev) => prev.filter((x) => !(x.item_type === l.item_type && x.item_id === l.item_id)));
    toast.success("הוסר מהמועדפים");
  };

  const filtered = filter === "all" ? likes : likes.filter((l) => l.item_type === filter);
  const counts = likes.reduce<Record<string, number>>((acc, l) => {
    acc[l.item_type] = (acc[l.item_type] || 0) + 1; return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (likes.length === 0) return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-3">עוד לא סימנת לייק לאף פריט</p>
      <p className="text-xs text-muted-foreground mb-4">אפשר לסמן לייק על מודעות יד 2, מוצרים בחנות, מקצועני מוזיקה וקורסים באקדמיה</p>
      <div className="flex justify-center gap-2 flex-wrap">
        <Link to="/marketplace"><Button variant="outline"><Tags className="h-4 w-4" />יד 2</Button></Link>
        <Link to="/shop"><Button variant="outline"><ShoppingBag className="h-4 w-4" />חנות</Button></Link>
        <Link to="/pros"><Button variant="outline"><Music2 className="h-4 w-4" />מקצוענים</Button></Link>
      </div>
    </div>
  );

  const FilterBtn = ({ value, label, icon: Icon }: { value: typeof filter; label: string; icon: any }) => (
    <Button size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)} className="gap-1">
      <Icon className="h-3.5 w-3.5" />
      {label}
      {value !== "all" && counts[value] ? <Badge variant="secondary" className="me-1 h-5 px-1.5">{counts[value]}</Badge> : null}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterBtn value="all" label={`הכל (${likes.length})`} icon={Heart} />
        <FilterBtn value="marketplace_listing" label="יד 2" icon={Tags} />
        <FilterBtn value="shop_product" label="חנות" icon={ShoppingBag} />
        <FilterBtn value="music_pro" label="מקצוענים" icon={Music2} />
        <FilterBtn value="shorts_video" label="שורטס" icon={Music2} />
        <FilterBtn value="academy_course" label="אקדמיה" icon={GraduationCap} />
        <FilterBtn value="forum_post" label="פורום" icon={MessageSquare} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const item = items[`${l.item_type}:${l.item_id}`];
          if (!item) {
            return (
              <div key={`${l.item_type}-${l.item_id}`} className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
                פריט לא זמין יותר
                <Button size="sm" variant="ghost" onClick={() => unlike(l)} className="block mt-2"><Trash2 className="h-3 w-3" /></Button>
              </div>
            );
          }
          return <LikedCard key={`${l.item_type}-${l.item_id}`} like={l} item={item} onUnlike={() => unlike(l)} />;
        })}
      </div>
    </div>
  );
}

function LikedCard({ like, item, onUnlike }: { like: LikeRow; item: any; onUnlike: () => void }) {
  const config: Record<string, { href: any; img?: string; title: string; subtitle?: string; tag: string; tagIcon: any }> = {
    marketplace_listing: {
      href: { to: "/marketplace/$listingId", params: { listingId: item.id } },
      img: item.images?.[0], title: item.title,
      subtitle: `₪${Number(item.price).toLocaleString()}`, tag: "יד 2", tagIcon: Tags,
    },
    shop_product: {
      href: { to: "/shop/$slug", params: { slug: item.slug } },
      img: item.main_image, title: item.title,
      subtitle: `₪${Number(item.sale_price ?? item.price).toLocaleString()}`, tag: "חנות", tagIcon: Store,
    },
    music_pro: {
      href: { to: "/pros/$proId", params: { proId: item.id } },
      img: item.profile_image, title: item.display_name, subtitle: item.headline, tag: "מקצוען", tagIcon: Music2,
    },
    forum_post: {
      href: { to: "/forum" }, img: undefined, title: item.title,
      subtitle: (item.content || "").slice(0, 80), tag: "פורום", tagIcon: MessageSquare,
    },
    shorts_video: {
      href: { to: "/shorts" }, img: item.thumbnail_url, title: item.title,
      subtitle: "סרטון שורטס", tag: "שורטס", tagIcon: Music2,
    },
  };
  const c = config[like.item_type];
  if (!c) return null;
  const Icon = c.tagIcon;
  return (
    <div className="rounded-2xl border bg-card-elevated overflow-hidden flex flex-col">
      <Link {...(c.href as any)} className="block">
        <div className="aspect-square bg-muted relative">
          {c.img && <img src={c.img} alt={c.title} className="w-full h-full object-cover" loading="lazy" />}
          <Badge className="absolute top-2 end-2 gap-1"><Icon className="h-3 w-3" />{c.tag}</Badge>
        </div>
      </Link>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <Link {...(c.href as any)} className="block font-semibold text-sm line-clamp-1 hover:text-primary">
          {c.title}
        </Link>
        {c.subtitle && <div className="text-xs text-muted-foreground line-clamp-1">{c.subtitle}</div>}
        <div className="flex justify-end mt-auto">
          <Button size="sm" variant="ghost" onClick={onUnlike} className="text-rose-500 h-8">
            <Heart className="h-4 w-4 fill-current" />הסר
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Following ----------
type FollowRow = { id: string; target_type: string; target_id: string; created_at: string };

function FollowingList({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<"all" | "marketplace_seller" | "music_pro" | "shorts_creator" | "user">("all");
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [pros, setPros] = useState<Record<string, { display_name: string; profile_image: string | null; headline: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("user_follows")
        .select("id, target_type, target_id, created_at")
        .eq("follower_id", userId).order("created_at", { ascending: false });
      const rows = (data ?? []) as FollowRow[];
      setFollows(rows);
      const userIds = rows.filter((r) => r.target_type !== "music_pro").map((r) => r.target_id);
      const proIds = rows.filter((r) => r.target_type === "music_pro").map((r) => r.target_id);
      if (userIds.length) {
        const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
        const m: typeof profiles = {};
        for (const p of ps ?? []) m[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        setProfiles(m);
      }
      if (proIds.length) {
        const { data: ps } = await supabase.from("music_pros").select("id, display_name, profile_image, headline").in("id", proIds);
        const m: typeof pros = {};
        for (const p of ps ?? []) m[p.id] = { display_name: p.display_name, profile_image: p.profile_image, headline: p.headline };
        setPros(m);
      }
      setLoading(false);
    })();
  }, [userId]);

  const unfollow = async (f: FollowRow) => {
    await supabase.from("user_follows").delete().eq("id", f.id);
    setFollows((prev) => prev.filter((x) => x.id !== f.id));
    toast.success("הוסר מעקב");
  };

  const labelFor = (t: string) =>
    t === "marketplace_seller" ? "מוכר ביד 2" :
    t === "music_pro" ? "מוזיקאי" :
    t === "shorts_creator" ? "יוצר שורטס" : "משתמש";

  const filtered = filter === "all" ? follows : follows.filter((f) => f.target_type === filter);
  const counts = follows.reduce<Record<string, number>>((a, f) => { a[f.target_type] = (a[f.target_type] || 0) + 1; return a; }, {});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (follows.length === 0) return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <UserIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-3">עדיין אינך עוקב אחרי אף אחד</p>
      <p className="text-xs text-muted-foreground">אפשר לעקוב אחרי מוכרים ביד 2, מוזיקאים, ויוצרי שורטס</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>הכל ({follows.length})</Button>
        <Button size="sm" variant={filter === "marketplace_seller" ? "default" : "outline"} onClick={() => setFilter("marketplace_seller")}>
          <Tags className="h-3.5 w-3.5" />מוכרים ביד 2 {counts.marketplace_seller ? `(${counts.marketplace_seller})` : ""}
        </Button>
        <Button size="sm" variant={filter === "music_pro" ? "default" : "outline"} onClick={() => setFilter("music_pro")}>
          <Music2 className="h-3.5 w-3.5" />מוזיקאים {counts.music_pro ? `(${counts.music_pro})` : ""}
        </Button>
        <Button size="sm" variant={filter === "shorts_creator" ? "default" : "outline"} onClick={() => setFilter("shorts_creator")}>
          יוצרי שורטס {counts.shorts_creator ? `(${counts.shorts_creator})` : ""}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((f) => {
          const isPro = f.target_type === "music_pro";
          const data = isPro ? pros[f.target_id] : profiles[f.target_id];
          const name = data ? (isPro ? (data as any).display_name : (data as any).display_name) : "משתמש";
          const img = data ? (isPro ? (data as any).profile_image : (data as any).avatar_url) : null;
          return (
            <div key={f.id} className="rounded-2xl border bg-card-elevated p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={img || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{(name || "?").slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{name || "משתמש"}</div>
                <Badge variant="outline" className="text-xs mt-1">{labelFor(f.target_type)}</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => unfollow(f)} className="text-muted-foreground">הסר</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Saved Searches ----------
type SavedSearch = {
  id: string; name: string; filters: Record<string, any>;
  notify_email: boolean; created_at: string;
};

function SavedSearches({ userId }: { userId: string }) {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as SavedSearch[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const toggleNotify = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("marketplace_saved_searches")
      .update({ notify_email: !current })
      .eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(!current ? "התראות הופעלו" : "התראות בוטלו");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את החיפוש השמור?")) return;
    const { error } = await supabase.from("marketplace_saved_searches").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("נמחק");
    load();
  };

  const buildSearchUrl = (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? `/marketplace?${qs}` : "/marketplace";
  };

  const describeFilters = (f: Record<string, any>) => {
    const parts: string[] = [];
    if (f.category) parts.push(`קטגוריה: ${f.category}`);
    if (f.brand) parts.push(`מותג: ${f.brand}`);
    if (f.city) parts.push(`עיר: ${f.city}`);
    if (f.condition) parts.push(`מצב: ${f.condition}`);
    if (f.minPrice || f.maxPrice) parts.push(`מחיר: ${f.minPrice || 0}–${f.maxPrice || "∞"}₪`);
    if (f.urgent) parts.push("מכירה דחופה");
    if (f.q) parts.push(`חיפוש: "${f.q}"`);
    return parts.length ? parts.join(" · ") : "כל המודעות";
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (items.length === 0) return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-1">עוד לא שמרת חיפושים</p>
      <p className="text-xs text-muted-foreground mb-4">סנן את הלוח לפי הצרכים שלך, ולחץ "שמור חיפוש" כדי לקבל התראה כשעולה מודעה תואמת</p>
      <Link to="/marketplace"><Button variant="outline"><Search className="h-4 w-4" />עבור ללוח</Button></Link>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {items.length} חיפושים שמורים. נשלח לך מייל כשעולה מודעה חדשה התואמת את הסינון.
      </p>
      {items.map((s) => (
        <div key={s.id} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2">
                <Bell className={`h-4 w-4 ${s.notify_email ? "text-primary" : "text-muted-foreground"}`} />
                {s.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{describeFilters(s.filters)}</div>
            </div>
            <Badge variant={s.notify_email ? "default" : "secondary"} className="shrink-0">
              {s.notify_email ? "התראות פעילות" : "ללא התראות"}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            <a href={buildSearchUrl(s.filters)}>
              <Button size="sm" variant="outline"><Search className="h-3 w-3" />הצג תוצאות</Button>
            </a>
            <Button size="sm" variant="outline" onClick={() => toggleNotify(s.id, s.notify_email)}>
              <Bell className="h-3 w-3" />{s.notify_email ? "כבה התראות" : "הפעל התראות"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive">
              <Trash2 className="h-3 w-3" />מחק
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Combined ----------
export function SocialActivityTab({ userId }: { userId: string }) {
  const [sub, setSub] = useState<"liked" | "following" | "searches">("liked");
  return (
    <Tabs value={sub} onValueChange={(v) => setSub(v as typeof sub)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="liked" className="gap-1"><Heart className="h-4 w-4" />שאהבתי</TabsTrigger>
        <TabsTrigger value="following" className="gap-1"><UserIcon className="h-4 w-4" />עוקב אחרי</TabsTrigger>
        <TabsTrigger value="searches" className="gap-1"><Bell className="h-4 w-4" />חיפושים שמורים</TabsTrigger>
      </TabsList>
      <TabsContent value="liked" className="mt-4"><LikedItems userId={userId} /></TabsContent>
      <TabsContent value="following" className="mt-4"><FollowingList userId={userId} /></TabsContent>
      <TabsContent value="searches" className="mt-4"><SavedSearches userId={userId} /></TabsContent>
    </Tabs>
  );
}
