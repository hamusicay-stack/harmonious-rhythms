import { friendlyError } from "@/lib/errors";
import { requireAuth } from "@/lib/routeGuards";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Save, User as UserIcon, Tags, Heart, Building2, Eye, Bell,
  Music2, Pencil, ShoppingBag, GraduationCap, Sparkles, Piano, Crown, Coins, Bookmark, Newspaper, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { labelOf, SPECIALTIES } from "@/lib/prosData";
import { NotificationsList } from "@/components/NotificationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { HardwareTab } from "@/components/dashboard/HardwareTab";
import { MyCoursesTab } from "@/components/dashboard/MyCoursesTab";
import { MyOrdersTab } from "@/components/dashboard/MyOrdersTab";
import { MyPointsTab } from "@/components/dashboard/MyPointsTab";
import { MyListingsTab } from "@/components/dashboard/MyListingsTab";
import { BusinessSellerTab } from "@/components/dashboard/BusinessSellerTab";
import { SocialActivityTab } from "@/components/dashboard/SocialActivityTab";
import { SubscriptionTab } from "@/components/dashboard/SubscriptionTab";
import { PublicProfileTab } from "@/components/dashboard/PublicProfileTab";
import { AccountSettingsTab } from "@/components/dashboard/AccountSettingsTab";
import { BookmarksTab } from "@/components/dashboard/BookmarksTab";
import { MyPurchasesTab } from "@/components/dashboard/MyPurchasesTab";
import { SubmitNewsTab } from "@/components/dashboard/SubmitNewsTab";
import { CentralChatHub } from "@/components/chat/CentralChatHub";
import { ShieldCheck } from "lucide-react";

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

function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const initialQuery = (() => {
    if (typeof window === "undefined") return { tab: "profile", subTab: null as string | null, openReview: null as string | null };
    const sp = new URLSearchParams(window.location.search);
    return {
      tab: sp.get("tab") || "profile",
      subTab: sp.get("subTab"),
      openReview: sp.get("openReview"),
    };
  })();
  const [tab, setTab] = useState(initialQuery.tab);

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

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-6xl px-4 pt-6 md:px-8">
        <DashboardHero userId={user.id} email={user.email ?? null} profile={(profile as any) ?? null} />
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 h-auto">
            <TabsTrigger value="profile" className="gap-1"><UserIcon className="h-4 w-4" />פרופיל ציבורי</TabsTrigger>
            <TabsTrigger value="account" className="gap-1"><Eye className="h-4 w-4" />חשבון</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1"><Crown className="h-4 w-4" />מנוי VIP</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />התראות</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1"><MessageCircle className="h-4 w-4" />צ'אט והודעות</TabsTrigger>
            <TabsTrigger value="courses" className="gap-1"><GraduationCap className="h-4 w-4" />האקדמיה שלי</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" />ההזמנות שלי</TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-1"><Bookmark className="h-4 w-4" />השמירות שלי</TabsTrigger>
            <TabsTrigger value="points" className="gap-1"><Coins className="h-4 w-4" />הנקודות שלי</TabsTrigger>
            <TabsTrigger value="hardware" className="gap-1"><Piano className="h-4 w-4" />חומרה</TabsTrigger>
            <TabsTrigger value="yad2" className="gap-1"><Tags className="h-4 w-4" />יד 2</TabsTrigger>
            <TabsTrigger value="pro" className="gap-1"><Music2 className="h-4 w-4" />האינדקס שלי</TabsTrigger>
            <TabsTrigger value="social" className="gap-1"><Heart className="h-4 w-4" />פעילות</TabsTrigger>
            <TabsTrigger value="submit-news" className="gap-1"><Newspaper className="h-4 w-4" />פרסם כתבה</TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-1"><Sparkles className="h-4 w-4" />שותף</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <PublicProfileTab refreshProfile={refreshProfile} />
          </TabsContent>

          <TabsContent value="account" className="mt-6">
            <AccountSettingsTab refreshProfile={refreshProfile} />
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <SubscriptionTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-6">
            <NotificationsList />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <CentralChatHub />
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <MyCoursesTab userId={user.id} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <MyOrdersTab userId={user.id} />
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6">
            <BookmarksTab userId={user.id} />
          </TabsContent>

          <TabsContent value="points" className="mt-6">
            <MyPointsTab userId={user.id} />
          </TabsContent>

          <TabsContent value="hardware" className="mt-6">
            <HardwareTab userId={user.id} />
          </TabsContent>

          <TabsContent value="yad2" className="mt-6">
            <Yad2Section
              userId={user.id}
              email={user.email ?? ""}
              initialSubTab={initialQuery.subTab}
              openReviewForListing={initialQuery.openReview}
            />
          </TabsContent>

          <TabsContent value="pro" className="mt-6">
            <MyProIndex userId={user.id} />
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <SocialActivityTab userId={user.id} />
          </TabsContent>

          <TabsContent value="submit-news" className="mt-6">
            <SubmitNewsTab userId={user.id} />
          </TabsContent>

          <TabsContent value="affiliate" className="mt-6">
            <AffiliateDashboard />
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}

function Yad2Section({
  userId,
  email,
  initialSubTab,
  openReviewForListing,
}: {
  userId: string;
  email: string;
  initialSubTab?: string | null;
  openReviewForListing?: string | null;
}) {
  type Sub = "listings" | "purchases" | "business";
  const validSubs: Sub[] = ["listings", "purchases", "business"];
  const initial: Sub = validSubs.includes(initialSubTab as Sub) ? (initialSubTab as Sub) : "listings";
  const [sub, setSub] = useState<Sub>(initial);
  return (
    <Tabs value={sub} onValueChange={(v) => setSub(v as Sub)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="listings" className="gap-1"><Tags className="h-4 w-4" />המודעות שלי</TabsTrigger>
        <TabsTrigger value="purchases" className="gap-1"><ShieldCheck className="h-4 w-4" />הקניות שלי</TabsTrigger>
        <TabsTrigger value="business" className="gap-1"><Building2 className="h-4 w-4" />עסקי</TabsTrigger>
      </TabsList>
      <TabsContent value="listings" className="mt-4">
        <MyListingsTab userId={userId} />
      </TabsContent>
      <TabsContent value="purchases" className="mt-4">
        <MyPurchasesTab userId={userId} autoOpenReviewForListing={openReviewForListing ?? null} />
      </TabsContent>
      <TabsContent value="business" className="mt-4">
        <BusinessSellerTab userId={userId} email={email} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileForm({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "", username: "", bio: "", location: "", website: "", instagram: "", youtube: "",
    phone: "", has_whatsapp: false,
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
        phone: (profile as { phone?: string | null }).phone ?? "",
        has_whatsapp: !!(profile as { has_whatsapp?: boolean | null }).has_whatsapp,
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
        phone: form.phone || null,
        has_whatsapp: !!form.phone && form.has_whatsapp,
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
    if (error) { toast.error(friendlyError(error)); return; }
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
          <Input id="username" value={form.username}
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
          <Label htmlFor="profile_phone">טלפון</Label>
          <Input id="profile_phone" type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="050-1234567" />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-muted-foreground">
          <Checkbox
            checked={form.has_whatsapp}
            onCheckedChange={(v) => setForm({ ...form, has_whatsapp: v === true })}
            disabled={!form.phone.trim()}
            className="mt-0.5"
          />
          <span>יש לי וואטסאפ פעיל במספר זה</span>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">אתר אישי</Label>
          <Input id="website" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@username" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="youtube">YouTube</Label>
        <Input id="youtube" value={form.youtube}
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

function MyProIndex({ userId }: { userId: string }) {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
