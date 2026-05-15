import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight, Loader2, ShieldAlert, Mail, Phone, MapPin, Music, Crown,
  Plus, Tag as TagIcon, X, Calendar, ShoppingCart, BookOpen, MessageSquare,
  PhoneCall, Users as UsersIcon, FileText, DollarSign, Store, ShoppingBag,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "כרטיס לקוח — המוזיקאי" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  user_type: string;
  organ_model: string | null;
  subscription_tier: string;
  specialties: string[] | null;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  created_at: string;
  email_opt_in?: boolean;
  last_login_at?: string | null;
};

type CustomerTag = { id: string; tag: string; color: string | null };
type Interaction = {
  id: string;
  type: "note" | "call" | "email" | "meeting" | "purchase" | "lesson" | "signup" | "other";
  title: string;
  description: string | null;
  occurred_at: string;
};
type Order = {
  id: string;
  product_name: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
};

const TAG_COLORS = [
  { value: "default", label: "אפור" },
  { value: "gold", label: "זהב (VIP)" },
  { value: "blue", label: "כחול" },
  { value: "green", label: "ירוק" },
  { value: "red", label: "אדום (אזהרה)" },
];

const TAG_COLOR_CLASSES: Record<string, string> = {
  default: "bg-secondary text-secondary-foreground",
  gold: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground",
  blue: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  green: "bg-green-500/20 text-green-700 dark:text-green-300",
  red: "bg-destructive/20 text-destructive",
};

const INTERACTION_ICONS: Record<Interaction["type"], React.ComponentType<{ className?: string }>> = {
  note: FileText,
  call: PhoneCall,
  email: Mail,
  meeting: UsersIcon,
  purchase: ShoppingCart,
  lesson: BookOpen,
  signup: Crown,
  other: MessageSquare,
};

const INTERACTION_LABELS: Record<Interaction["type"], string> = {
  note: "הערה",
  call: "שיחה",
  email: "אימייל",
  meeting: "פגישה",
  purchase: "רכישה",
  lesson: "שיעור",
  signup: "הרשמה",
  other: "אחר",
};

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [listingsCount, setListingsCount] = useState(0);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("default");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    setLoading(true);
    const [p, t, i, o, so, en, ml, ci] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", customerId).maybeSingle(),
      supabase.from("customer_tags").select("*").eq("customer_id", customerId).order("created_at"),
      supabase.from("customer_interactions").select("*").eq("customer_id", customerId).order("occurred_at", { ascending: false }),
      supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("shop_orders").select("id, order_number, total_amount, status, payment_status, created_at").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("academy_enrollments").select("id, course_id, progress_percent, status, last_accessed_at, academy_courses(title)").eq("user_id", customerId),
      supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("seller_id", customerId).eq("status", "approved"),
      supabase.from("cart_items").select("*").eq("user_id", customerId).order("added_at", { ascending: false }),
    ]);
    setProfile(p.data as Profile | null);
    setTags((t.data as CustomerTag[]) ?? []);
    setInteractions((i.data as Interaction[]) ?? []);
    setOrders((o.data as Order[]) ?? []);
    setShopOrders(so.data ?? []);
    setEnrollments(en.data ?? []);
    setListingsCount(ml.count ?? 0);
    setCartItems(ci.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, customerId]);

  const addTag = async () => {
    if (!newTag.trim()) return;
    const { error } = await supabase.from("customer_tags").insert({
      customer_id: customerId,
      tag: newTag.trim(),
      color: newTagColor,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    setNewTag("");
    setNewTagColor("default");
    load();
  };

  const removeTag = async (id: string) => {
    const { error } = await supabase.from("customer_tags").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (authLoading || (user && loading && isAdmin)) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="font-display text-3xl font-bold">גישה נדחתה</h1>
          <Button onClick={() => navigate({ to: "/" })}>חזרה לדף הבית</Button>
        </div>
      </SiteLayout>
    );
  }

  if (!profile) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">לקוח לא נמצא.</p>
          <Button asChild className="mt-4"><Link to="/admin">חזרה ללוח הבקרה</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  const displayName = profile.display_name || profile.full_name || profile.email || "ללא שם";
  const initials = displayName.slice(0, 2).toUpperCase();

  const ltv = (shopOrders ?? [])
    .filter((o: any) => o.payment_status === "paid")
    .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0)
    + (orders ?? [])
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalOrdersCount = (shopOrders?.length ?? 0) + orders.length;
  const abandonedCart = cartItems.filter((c: any) => {
    const ageH = (Date.now() - new Date(c.added_at).getTime()) / 3600000;
    return ageH >= 2;
  });

  return (
    <SiteLayout>
      <section className="border-b border-border/40 bg-hero">
        <div className="container mx-auto px-4 py-8 md:px-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/admin"><ArrowRight className="ml-2 h-4 w-4" />חזרה ללוח הבקרה</Link>
          </Button>
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar className="h-24 w-24 border-2 border-primary/40">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{profile.user_type}</Badge>
                <Badge>{profile.subscription_tier}</Badge>
                {profile.organ_model && <Badge variant="outline"><Music className="ml-1 h-3 w-3" />{profile.organ_model}</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-4 w-4" />{profile.phone}</span>}
                {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}
              </div>
            </div>
            <div className="md:self-start">
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => {
                  startImpersonation({
                    id: profile.id,
                    name: displayName,
                    email: profile.email,
                    avatar_url: profile.avatar_url,
                  });
                  toast.success(`מצב השתלטות הופעל עבור ${displayName}`);
                  navigate({ to: "/" });
                }}
              >
                <Eye className="h-4 w-4" />
                השתלטות על חשבון
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <TagIcon className="h-4 w-4" /> תגיות
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span key={t.id} className={`group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${TAG_COLOR_CLASSES[t.color ?? "default"]}`}>
                  {t.tag}
                  <button onClick={() => removeTag(t.id)} className="opacity-60 hover:opacity-100" aria-label="הסר תגית">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="תגית חדשה..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
                  className="h-8 w-40"
                />
                <Select value={newTagColor} onValueChange={setNewTagColor}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAG_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addTag} disabled={!newTag.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pt-8 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard icon={DollarSign} label="LTV (סה״כ הוצאה)" value={`₪${ltv.toLocaleString()}`} />
          <StatCard icon={ShoppingCart} label="הזמנות" value={String(totalOrdersCount)} />
          <StatCard icon={BookOpen} label="קורסים" value={String(enrollments.length)} />
          <StatCard icon={Store} label="מודעות יד שנייה" value={String(listingsCount)} />
          <StatCard
            icon={profile.email_opt_in ? CheckCircle2 : XCircle}
            label="דיוור"
            value={profile.email_opt_in ? "מאושר" : "לא מאושר"}
            tone={profile.email_opt_in ? "success" : "muted"}
          />
        </div>
        {abandonedCart.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <ShoppingBag className="h-4 w-4 text-amber-600" />
            <strong>עגלה נטושה:</strong> {abandonedCart.length} פריטים בעגלה מעל שעתיים.
          </div>
        )}
        {profile.last_login_at && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> כניסה אחרונה: {new Date(profile.last_login_at).toLocaleString("he-IL")}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-8 md:px-8">
        <Tabs defaultValue="timeline" dir="rtl">
          <div className="overflow-x-auto" dir="rtl">
            <TabsList>
              <TabsTrigger value="timeline"><Calendar className="ml-2 h-4 w-4" />ציר זמן</TabsTrigger>
              <TabsTrigger value="details"><FileText className="ml-2 h-4 w-4" />פרטים</TabsTrigger>
              <TabsTrigger value="orders"><ShoppingCart className="ml-2 h-4 w-4" />הזמנות ({totalOrdersCount})</TabsTrigger>
              <TabsTrigger value="courses"><BookOpen className="ml-2 h-4 w-4" />קורסים ({enrollments.length})</TabsTrigger>
              <TabsTrigger value="marketplace"><Store className="ml-2 h-4 w-4" />יד שנייה ({listingsCount})</TabsTrigger>
              <TabsTrigger value="cart"><ShoppingBag className="ml-2 h-4 w-4" />עגלה ({cartItems.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="timeline" className="mt-6 space-y-4">
            <AddInteractionCard customerId={customerId} userId={user.id} onAdded={load} />
            <Card>
              <CardHeader><CardTitle>היסטוריית אינטראקציות</CardTitle></CardHeader>
              <CardContent>
                <div className="relative space-y-4">
                  {/* Auto signup entry */}
                  <TimelineItem
                    icon={Crown}
                    title="הצטרף למערכת"
                    subtitle={new Date(profile.created_at).toLocaleString("he-IL")}
                    type="signup"
                  />
                  {orders.map((o) => (
                    <TimelineItem
                      key={`o-${o.id}`}
                      icon={ShoppingCart}
                      title={`רכישה: ${o.product_name}`}
                      subtitle={`${new Date(o.created_at).toLocaleString("he-IL")} · ${o.currency} ${o.amount} · ${o.payment_status}`}
                      type="purchase"
                    />
                  ))}
                  {interactions.map((i) => {
                    const Icon = INTERACTION_ICONS[i.type];
                    return (
                      <TimelineItem
                        key={i.id}
                        icon={Icon}
                        title={i.title}
                        subtitle={`${INTERACTION_LABELS[i.type]} · ${new Date(i.occurred_at).toLocaleString("he-IL")}`}
                        description={i.description}
                        type={i.type}
                      />
                    );
                  })}
                  {interactions.length === 0 && orders.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">אין עדיין אינטראקציות מתועדות.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <Card>
              <CardHeader><CardTitle>פרטים אישיים</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailField label="שם תצוגה" value={profile.display_name} />
                <DetailField label="שם מלא" value={profile.full_name} />
                <DetailField label="אימייל" value={profile.email} dir="ltr" />
                <DetailField label="טלפון" value={profile.phone} dir="ltr" />
                <DetailField label="מיקום" value={profile.location} />
                <DetailField label="דגם אורגן" value={profile.organ_model} />
                <DetailField label="אתר" value={profile.website} dir="ltr" />
                <DetailField label="אינסטגרם" value={profile.instagram} dir="ltr" />
                <DetailField label="יוטיוב" value={profile.youtube} dir="ltr" />
                <DetailField label="התמחויות" value={profile.specialties?.join(", ") ?? null} />
                <div className="md:col-span-2">
                  <DetailField label="ביוגרפיה" value={profile.bio} multiline />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader><CardTitle>הזמנות</CardTitle></CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">אין הזמנות.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div>
                          <div className="font-medium">{o.product_name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("he-IL")}</div>
                        </div>
                        <div className="text-end">
                          <div className="font-bold">{o.currency} {Number(o.amount).toLocaleString()}</div>
                          <Badge variant={o.payment_status === "paid" ? "default" : "outline"}>{o.payment_status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <Card>
              <CardHeader><CardTitle>קורסים</CardTitle></CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">לא נרשם לקורסים.</p>
                ) : (
                  <div className="space-y-2">
                    {enrollments.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div>
                          <div className="font-medium">{e.academy_courses?.title ?? "קורס"}</div>
                          <div className="text-xs text-muted-foreground">
                            סטטוס: {e.status} · התקדמות: {Math.round(e.progress_percent ?? 0)}%
                            {e.last_accessed_at && ` · נצפה לאחרונה: ${new Date(e.last_accessed_at).toLocaleDateString("he-IL")}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <Card>
              <CardHeader><CardTitle>פעילות יד שנייה</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {listingsCount === 0 ? "אין מודעות פעילות." : `${listingsCount} מודעות פעילות.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cart" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">עגלת קניות {abandonedCart.length > 0 && <Badge variant="outline">נטשה</Badge>}</CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">העגלה ריקה.</p>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((c: any) => {
                      const ageH = Math.round((Date.now() - new Date(c.added_at).getTime()) / 3600000);
                      return (
                        <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                          <div className="flex items-center gap-3">
                            {c.image && <img src={c.image} alt="" className="h-12 w-12 rounded object-cover" />}
                            <div>
                              <div className="font-medium">{c.title}</div>
                              <div className="text-xs text-muted-foreground">כמות: {c.qty} · נוסף לפני {ageH} שעות</div>
                            </div>
                          </div>
                          <div className="font-bold">₪{Number(c.price).toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "success" | "muted" }) {
  const toneClass = tone === "success" ? "text-emerald-600" : tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className={`flex items-center gap-1 text-xs ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function DetailField({ label, value, dir, multiline }: { label: string; value: string | null; dir?: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 ${multiline ? "whitespace-pre-wrap" : "truncate"}`} dir={dir}>{value || "—"}</div>
    </div>
  );
}

function TimelineItem({
  icon: Icon, title, subtitle, description, type,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description?: string | null;
  type: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 rounded-lg border border-border/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">{title}</div>
          <Badge variant="outline" className="text-xs">{type}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
        {description && <p className="mt-2 text-sm">{description}</p>}
      </div>
    </div>
  );
}

function AddInteractionCard({ customerId, userId, onAdded }: { customerId: string; userId: string; onAdded: () => void }) {
  const [type, setType] = useState<Interaction["type"]>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error("כותרת חובה"); return; }
    setSaving(true);
    const { error } = await supabase.from("customer_interactions").insert({
      customer_id: customerId,
      type,
      title,
      description: description || null,
      created_by: userId,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("האינטראקציה נוספה");
    setTitle(""); setDescription(""); setType("note");
    onAdded();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">הוסף אינטראקציה</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>סוג</Label>
            <Select value={type} onValueChange={(v) => setType(v as Interaction["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INTERACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>כותרת</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: שיחת מכירה ראשונית" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>פרטים</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}הוסף
        </Button>
      </CardContent>
    </Card>
  );
}
