import { requireAuth } from "@/lib/routeGuards";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Save, User as UserIcon, Tags, Heart, Building2, Eye, ArrowUp,
  Trash2, Plus, CheckCircle2, Clock, XCircle, Bell, Search, Music2, Pencil,
  Phone, MessageCircle, ShoppingBag, GraduationCap, MessageSquare, Store, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { labelOf, SPECIALTIES } from "@/lib/prosData";
import { NotificationsList } from "@/components/NotificationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";
import { UserBadges } from "@/components/UserBadges";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "הפרופיל שלי — המוזיקאי" },
      { name: "description", content: "ניהול הפרופיל, המודעות והפרסומים שאהבתי." },
    ],
  }),
  component: ProfilePage,
});

type Listing = {
  id: string; title: string; price: number; status: string; views_count: number;
  images: string[]; created_at: string; bump_expires_at: string | null;
  category: string; brand: string | null;
};

function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  const initials = (profile?.display_name || user.email || "?")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div
          className="relative w-full"
          style={{
            minHeight: 160,
            backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!profile?.banner_url && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
        </div>
        <div className="container mx-auto px-4 pb-10 pt-4 md:px-8">
          <div className="flex flex-col items-center gap-4 text-center -mt-14">
            <Avatar className="h-24 w-24 border-4 border-background shadow-gold">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl flex items-center gap-2 flex-wrap">
                <span>{profile?.display_name || "הפרופיל שלי"}</span>
                <UserBadges userId={user.id} size="sm" />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto">
            <TabsTrigger value="profile" className="gap-1"><UserIcon className="h-4 w-4" />פרופיל</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />התראות</TabsTrigger>
            <TabsTrigger value="yad2" className="gap-1"><Tags className="h-4 w-4" />יד 2</TabsTrigger>
            <TabsTrigger value="pro" className="gap-1"><Music2 className="h-4 w-4" />האינדקס שלי</TabsTrigger>
            <TabsTrigger value="liked" className="gap-1"><Heart className="h-4 w-4" />שאהבתי</TabsTrigger>
            <TabsTrigger value="following" className="gap-1"><UserIcon className="h-4 w-4" />עוקב אחרי</TabsTrigger>
            <TabsTrigger value="searches" className="gap-1"><Bell className="h-4 w-4" />חיפושים</TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-1"><Sparkles className="h-4 w-4" />שותף</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileForm refreshProfile={refreshProfile} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-6">
            <NotificationSettings />
            <NotificationsList />
          </TabsContent>

          <TabsContent value="yad2" className="mt-6">
            <Yad2Section userId={user.id} email={user.email ?? ""} />
          </TabsContent>

          <TabsContent value="pro" className="mt-6">
            <MyProIndex userId={user.id} />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <LikedItems userId={user.id} />
          </TabsContent>

          <TabsContent value="following" className="mt-6">
            <FollowingList userId={user.id} />
          </TabsContent>

          <TabsContent value="searches" className="mt-6">
            <SavedSearches userId={user.id} />
          </TabsContent>

          <TabsContent value="affiliate" className="mt-6">
            <AffiliateDashboard />
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}

function Yad2Section({ userId, email }: { userId: string; email: string }) {
  const [sub, setSub] = useState<"listings" | "business">("listings");
  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={(v) => setSub(v as "listings" | "business")} dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings" className="gap-1"><Tags className="h-4 w-4" />המודעות שלי</TabsTrigger>
          <TabsTrigger value="business" className="gap-1"><Building2 className="h-4 w-4" />עסקי</TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4">
          <MyListings userId={userId} />
        </TabsContent>
        <TabsContent value="business" className="mt-4">
          <BusinessTab userId={userId} email={email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "", username: "", bio: "", location: "", website: "", instagram: "", youtube: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        website: profile.website ?? "",
        instagram: profile.instagram ?? "",
        youtube: profile.youtube ?? "",
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name || null,
        username: form.username || null,
        bio: form.bio || null,
        location: form.location || null,
        website: form.website || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
      }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("הפרופיל עודכן בהצלחה");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "שגיאה בשמירה";
      toast.error(message.includes("duplicate") ? "שם המשתמש תפוס" : message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    if (!user) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("profile-banners").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("profile-banners").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase.from("profiles").update(kind === "avatar" ? { avatar_url: url } : { banner_url: url }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(kind === "avatar" ? "תמונת הפרופיל עודכנה" : "הבאנר עודכן");
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-border/60 bg-card-elevated p-6 shadow-elegant md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>תמונת פרופיל</Label>
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
              העלה תמונה
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "avatar"); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>באנר פרופיל</Label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-28 rounded-md border border-border bg-muted overflow-hidden">
              {profile?.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
              העלה באנר
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "banner"); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="display_name">שם תצוגה</Label>
          <Input id="display_name" value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">שם משתמש</Label>
          <Input id="username" value={form.username} dir="ltr"
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
            placeholder="username" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">ביוגרפיה</Label>
        <Textarea id="bio" value={form.bio} rows={4}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="ספרו על עצמכם, על המוזיקה שלכם..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">מיקום</Label>
        <Input id="location" value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="תל אביב, ישראל" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">אתר אישי</Label>
          <Input id="website" value={form.website} dir="ltr"
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" value={form.instagram} dir="ltr"
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@username" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="youtube">YouTube</Label>
        <Input id="youtube" value={form.youtube} dir="ltr"
          onChange={(e) => setForm({ ...form, youtube: e.target.value })}
          placeholder="https://youtube.com/@..." />
      </div>
      <div className="flex justify-end gap-3 border-t border-border/40 pt-6">
        <Button type="submit" disabled={saving}
          className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          שמירת שינויים
        </Button>
      </div>
    </form>
  );
}

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" />פעיל</Badge>;
  if (status === "pending") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />ממתין לאישור</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />נדחה</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function MyListings({ userId }: { userId: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Record<string, { phone: number; whatsapp: number; likes: number }>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id, title, price, status, views_count, images, created_at, bump_expires_at, category, brand")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    const items = (data ?? []) as Listing[];
    setListings(items);

    // Fetch event stats for owner's listings
    if (items.length > 0) {
      const ids = items.map((l) => l.id);
      const { data: events } = await supabase
        .from("marketplace_listing_events")
        .select("listing_id, event_type")
        .in("listing_id", ids);
      const acc: Record<string, { phone: number; whatsapp: number; likes: number }> = {};
      for (const id of ids) acc[id] = { phone: 0, whatsapp: 0, likes: 0 };
      for (const ev of events ?? []) {
        const row = acc[ev.listing_id];
        if (!row) continue;
        if (ev.event_type === "phone_click") row.phone++;
        else if (ev.event_type === "whatsapp_click") row.whatsapp++;
        else if (ev.event_type === "like") row.likes++;
        else if (ev.event_type === "unlike") row.likes = Math.max(0, row.likes - 1);
      }
      setStats(acc);
    } else {
      setStats({});
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const activeCount = listings.filter((l) => l.status === "approved").length;

  const bump = async (id: string) => {
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { error } = await supabase
      .from("marketplace_listings")
      .update({ bumped_at: new Date().toISOString(), bump_expires_at: expires })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("המודעה הוקפצה ל-24 שעות!");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את המודעה?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{listings.length}</div>
          <div className="text-xs text-muted-foreground">מודעות סה"כ</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
          <div className="text-xs text-muted-foreground">פעילות</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold flex items-center justify-center gap-1">
            <Eye className="h-5 w-5 text-muted-foreground" />{totalViews}
          </div>
          <div className="text-xs text-muted-foreground">צפיות סה"כ</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/marketplace/new">
          <Button size="sm"><Plus className="h-4 w-4" />פרסם מודעה חדשה</Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Tags className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">עוד לא פרסמת מודעות</p>
          <Link to="/marketplace/new"><Button>פרסם את המודעה הראשונה</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const bumped = l.bump_expires_at && new Date(l.bump_expires_at) > new Date();
            return (
              <div key={l.id} className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4">
                <Link to="/marketplace/$listingId" params={{ listingId: l.id }} className="shrink-0">
                  <div className="w-full sm:w-24 h-24 rounded-lg bg-muted overflow-hidden">
                    {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                </Link>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <Link to="/marketplace/$listingId" params={{ listingId: l.id }} className="font-semibold hover:text-primary line-clamp-1">
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      {statusBadge(l.status)}
                      {bumped && <Badge className="gap-1"><ArrowUp className="h-3 w-3" />מוקפץ</Badge>}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-primary">₪{Number(l.price).toLocaleString()}</span>
                    <span className="flex items-center gap-1" title="צפיות"><Eye className="h-3 w-3" />{l.views_count || 0}</span>
                    <span className="flex items-center gap-1" title="לחיצות על חיוג"><Phone className="h-3 w-3" />{stats[l.id]?.phone ?? 0}</span>
                    <span className="flex items-center gap-1" title="לחיצות על וואטסאפ"><MessageCircle className="h-3 w-3" />{stats[l.id]?.whatsapp ?? 0}</span>
                    <span className="flex items-center gap-1 text-rose-500" title="לייקים"><Heart className="h-3 w-3" />{stats[l.id]?.likes ?? 0}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {l.status === "approved" && !bumped && (
                      <Button size="sm" variant="outline" onClick={() => bump(l.id)}>
                        <ArrowUp className="h-3 w-3" />הקפץ ל-24ש
                      </Button>
                    )}
                    <Link to="/marketplace/$listingId" params={{ listingId: l.id }}>
                      <Button size="sm" variant="outline">צפה</Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => remove(l.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />מחק
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LikeRow = { item_type: string; item_id: string; created_at: string };

function LikedItems({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<"all" | "marketplace_listing" | "shop_product" | "music_pro" | "academy_course" | "forum_post" | "shorts_video">("all");
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [items, setItems] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Load global likes
    const { data: gLikes } = await supabase
      .from("user_likes")
      .select("item_type, item_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Backwards compat: also load legacy marketplace_likes
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
    // Dedup by item_type+item_id
    const seen = new Set<string>();
    const dedup = allLikes.filter((l) => {
      const k = `${l.item_type}:${l.item_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
    setLikes(dedup);

    // Group by type and fetch items in batches
    const groups: Record<string, string[]> = {};
    for (const l of dedup) {
      (groups[l.item_type] ||= []).push(l.item_id);
    }

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
        .select("id, title, content").in("id", groups.forum_post);
      for (const r of data ?? []) map[`forum_post:${r.id}`] = r;
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
      // Remove from both tables to be safe
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
    acc[l.item_type] = (acc[l.item_type] || 0) + 1;
    return acc;
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
    <Button
      size="sm"
      variant={filter === value ? "default" : "outline"}
      onClick={() => setFilter(value)}
      className="gap-1"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {value !== "all" && counts[value] ? <Badge variant="secondary" className="mr-1 h-5 px-1.5">{counts[value]}</Badge> : null}
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
      img: item.images?.[0],
      title: item.title,
      subtitle: `₪${Number(item.price).toLocaleString()}`,
      tag: "יד 2",
      tagIcon: Tags,
    },
    shop_product: {
      href: { to: "/shop/$slug", params: { slug: item.slug } },
      img: item.main_image,
      title: item.title,
      subtitle: `₪${Number(item.sale_price ?? item.price).toLocaleString()}`,
      tag: "חנות",
      tagIcon: Store,
    },
    music_pro: {
      href: { to: "/pros/$proId", params: { proId: item.id } },
      img: item.profile_image,
      title: item.display_name,
      subtitle: item.headline,
      tag: "מקצוען",
      tagIcon: Music2,
    },
    forum_post: {
      href: { to: "/forum" },
      img: undefined,
      title: item.title,
      subtitle: (item.content || "").slice(0, 80),
      tag: "פורום",
      tagIcon: MessageSquare,
    },
    shorts_video: {
      href: { to: "/shorts" },
      img: item.thumbnail_url,
      title: item.title,
      subtitle: "סרטון שורטס",
      tag: "שורטס",
      tagIcon: Music2,
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
          <Badge className="absolute top-2 right-2 gap-1"><Icon className="h-3 w-3" />{c.tag}</Badge>
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

function BusinessTab({ userId, email }: { userId: string; email: string }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ business_name: "", contact_name: "", phone: "", email: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_business_sellers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setAccount(data);
    if (data) {
      setForm({
        business_name: data.business_name ?? "",
        contact_name: data.contact_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? email,
      });
    } else {
      setForm({ business_name: "", contact_name: "", phone: "", email });
    }
    setLoading(false);
  }, [userId, email]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.business_name.trim()) { toast.error("שם העסק חובה"); return; }
    setSaving(true);
    const payload = {
      user_id: userId,
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || email,
      subscription_status: "active",
    };
    const { error } = account
      ? await supabase.from("marketplace_business_sellers").update(payload).eq("user_id", userId)
      : await supabase.from("marketplace_business_sellers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(account ? "פרטי העסק עודכנו" : "נרשמת כמוכר עסקי!");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="rounded-3xl border border-border/60 bg-card-elevated p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">{account ? "פרטי העסק" : "הירשם כמוכר עסקי"}</h2>
          <p className="text-xs text-muted-foreground">
            {account ? `סטטוס: ${account.subscription_status === "active" ? "פעיל" : account.subscription_status}` : "המודעות שלך יסומנו עם תג 'עסקי' ויקבלו חשיפה משופרת"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>שם העסק *</Label>
        <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="למשל: כלי נגינה ירושלים" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>איש קשר</Label>
          <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>טלפון</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>אימייל</Label>
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {account ? "שמור שינויים" : "הירשם כמוכר עסקי"}
        </Button>
      </div>
    </div>
  );
}

type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, any>;
  notify_email: boolean;
  created_at: string;
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
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "התראות הופעלו" : "התראות בוטלו");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את החיפוש השמור?")) return;
    const { error } = await supabase.from("marketplace_saved_searches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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

function MyProIndex({ userId }: { userId: string }) {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("music_pros")
        .select("id,display_name,headline,status,is_verified,subscription_tier,views_count,specialties,genres,region,cities")
        .eq("user_id", userId)
        .maybeSingle();
      setPro(data);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!pro) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <Music2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-3">עדיין לא יצרת פרופיל מוזיקאי באינדקס</p>
        <Link to="/pros/new"><Button>צור פרופיל מוזיקאי</Button></Link>
      </div>
    );
  }

  const statusLabel = pro.status === "approved" ? "פעיל" : pro.status === "pending" ? "ממתין לאישור" : pro.status;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{pro.views_count || 0}</div>
          <div className="text-xs text-muted-foreground">צפיות</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{statusLabel}</div>
          <div className="text-xs text-muted-foreground">סטטוס</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{pro.subscription_tier === "vip" ? "VIP" : "חינם"}</div>
          <div className="text-xs text-muted-foreground">מנוי</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card-elevated p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{pro.display_name}</h3>
          <div className="flex gap-2">
            {pro.is_verified && <Badge className="border-blue-500/40 bg-blue-500/15 text-blue-600">מאומת</Badge>}
          </div>
        </div>
        {pro.headline && <p className="text-sm text-muted-foreground">{pro.headline}</p>}
        <div className="text-xs text-muted-foreground">
          {pro.region && <span>📍 {pro.region} {pro.cities?.length > 0 ? `· ${pro.cities.join(", ")}` : ""}</span>}
        </div>
        {pro.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pro.specialties.map((s: string) => <Badge key={s} variant="outline" className="text-[11px]">{labelOf(SPECIALTIES, s)}</Badge>)}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Link to="/pros/$proId/edit" params={{ proId: pro.id }}>
            <Button size="sm"><Pencil className="ml-1 h-3.5 w-3.5" />ערוך פרופיל</Button>
          </Link>
          <Link to="/pros/$proId" params={{ proId: pro.id }}>
            <Button size="sm" variant="outline"><Eye className="ml-1 h-3.5 w-3.5" />צפה בפרופיל</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

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
