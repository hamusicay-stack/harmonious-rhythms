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
  Trash2, Pencil, Plus, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
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
        <div className="container mx-auto px-4 py-12 md:px-8 md:py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-2 border-primary/40 shadow-gold">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {profile?.display_name || "הפרופיל שלי"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="profile" className="gap-1"><UserIcon className="h-4 w-4" />פרופיל</TabsTrigger>
            <TabsTrigger value="listings" className="gap-1"><Tags className="h-4 w-4" />המודעות שלי</TabsTrigger>
            <TabsTrigger value="liked" className="gap-1"><Heart className="h-4 w-4" />שאהבתי</TabsTrigger>
            <TabsTrigger value="business" className="gap-1"><Building2 className="h-4 w-4" />עסקי</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileForm refreshProfile={refreshProfile} />
          </TabsContent>

          <TabsContent value="listings" className="mt-6">
            <MyListings userId={user.id} />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <LikedListings userId={user.id} />
          </TabsContent>

          <TabsContent value="business" className="mt-6">
            <BusinessTab userId={user.id} email={user.email ?? ""} />
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
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

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-border/60 bg-card-elevated p-6 shadow-elegant md:p-8">
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id, title, price, status, views_count, images, created_at, bump_expires_at, category, brand")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    setListings((data ?? []) as Listing[]);
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
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{l.views_count || 0} צפיות</span>
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
                    <Link to="/marketplace/$listingId/edit" params={{ listingId: l.id }}>
                      <Button size="sm" variant="outline"><Pencil className="h-3 w-3" />ערוך</Button>
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

function LikedListings({ userId }: { userId: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: likes } = await supabase
      .from("marketplace_likes")
      .select("listing_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const ids = (likes ?? []).map((l: any) => l.listing_id);
    if (ids.length === 0) { setListings([]); setLoading(false); return; }
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id, title, price, status, views_count, images, created_at, bump_expires_at, category, brand")
      .in("id", ids);
    // keep the like order
    const map = new Map((data ?? []).map((l: any) => [l.id, l]));
    setListings(ids.map((id) => map.get(id)).filter(Boolean) as Listing[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const unlike = async (id: string) => {
    const { error } = await supabase.from("marketplace_likes").delete().eq("listing_id", id).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast.success("הוסר מהמועדפים");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (listings.length === 0) return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-3">עוד לא סימנת לייק לאף מודעה</p>
      <Link to="/marketplace"><Button variant="outline">עיון בלוח</Button></Link>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => (
        <div key={l.id} className="rounded-2xl border bg-card-elevated overflow-hidden">
          <Link to="/marketplace/$listingId" params={{ listingId: l.id }}>
            <div className="aspect-square bg-muted">
              {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" loading="lazy" />}
            </div>
          </Link>
          <div className="p-3 space-y-2">
            <Link to="/marketplace/$listingId" params={{ listingId: l.id }} className="block font-semibold text-sm line-clamp-1 hover:text-primary">
              {l.title}
            </Link>
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold">₪{Number(l.price).toLocaleString()}</span>
              <Button size="sm" variant="ghost" onClick={() => unlike(l.id)} className="text-rose-500 h-8">
                <Heart className="h-4 w-4 fill-current" />הסר
              </Button>
            </div>
          </div>
        </div>
      ))}
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
