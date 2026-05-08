import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users, Building2, ClipboardList, TrendingUp, Loader2, Plus, Save, ShieldAlert,
  CheckCircle2, Circle, Clock, ShieldCheck, Trash2, Eye, Megaphone, Package, Zap, LayoutDashboard, Tags,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LeadCreateDialog } from "@/components/admin/LeadCreateDialog";
import { BannersManager } from "@/components/admin/BannersManager";
import { SupplierOrdersManager } from "@/components/admin/SupplierOrdersManager";
import { AutomationsManager } from "@/components/admin/AutomationsManager";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { MarketplaceManager } from "@/components/admin/MarketplaceManager";
import { MarketplaceSettings } from "@/components/admin/MarketplaceSettings";
import { BusinessSellersManager } from "@/components/admin/BusinessSellersManager";
import { MarketplaceCategoriesManager } from "@/components/admin/MarketplaceCategoriesManager";
import { ReportsManager } from "@/components/admin/ReportsManager";
import { MusicProsManager } from "@/components/admin/MusicProsManager";
import { ShopManager } from "@/components/admin/ShopManager";
import { ShortsManager } from "@/components/admin/ShortsManager";
import { AffiliatesManager } from "@/components/admin/AffiliatesManager";
import { AffiliatePayoutsManager } from "@/components/admin/AffiliatePayoutsManager";
import { AcademyManager } from "@/components/admin/AcademyManager";
import { RolesPermissionsManager } from "@/components/admin/RolesPermissionsManager";
import { AiPromptsManager } from "@/components/admin/AiPromptsManager";
import { Music2, ShoppingBag, Play, Sparkles, GraduationCap, KeyRound, Bot, Piano } from "lucide-react";
import { RhythmSetsManager } from "@/components/admin/RhythmSetsManager";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול המערכת — המוזיקאי" },
      { name: "description", content: "לוח בקרה למנהלי המוזיקאי." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Customer = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  user_type: string;
  organ_model: string | null;
  subscription_tier: string;
  created_at: string;
};

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Supplier = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  is_active: boolean;
  payment_notes: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  related_customer_id: string | null;
  related_lead_id: string | null;
  created_at: string;
};

const ORGAN_MODELS = ["Korg PA5X", "Korg PA4X", "Korg PA1000", "Yamaha Genos", "Yamaha PSR-SX900", "Roland", "אחר"];

function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ activeCustomers: 0, monthlySales: 0, newLeads: 0 });

  // Filters
  const [customerSearch, setCustomerSearch] = useState("");
  const [organFilter, setOrganFilter] = useState<string>("all");
  const [supplierSearch, setSupplierSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [c, l, s, t, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("amount").eq("payment_status", "paid").gte("created_at", monthStart.toISOString()),
    ]);

    if (c.data) setCustomers(c.data as Customer[]);
    if (l.data) setLeads(l.data as Lead[]);
    if (s.data) setSuppliers(s.data as Supplier[]);
    if (t.data) setTasks(t.data as Task[]);

    const monthlySales = (ordersRes.data ?? []).reduce((sum, o: { amount: number }) => sum + Number(o.amount || 0), 0);
    const newLeads = (l.data ?? []).filter((x: Lead) => x.status === "new").length;
    setStats({
      activeCustomers: (c.data ?? []).filter((x: Customer) => x.user_type === "customer").length,
      monthlySales,
      newLeads,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      if (organFilter !== "all" && c.organ_model !== organFilter) return false;
      if (!q) return true;
      return [c.display_name, c.full_name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [customers, customerSearch, organFilter]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.company_name, s.contact_name, s.email, s.phone].some((v) => v?.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

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
          <p className="text-muted-foreground">אזור זה מיועד למנהלי המערכת בלבד.</p>
          <Button onClick={() => navigate({ to: "/" })}>חזרה לדף הבית</Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div dir="rtl" className="text-right">
      <section className="border-b border-border/40 bg-hero">
        <div className="container mx-auto px-4 py-10 md:px-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">חדר הבקרה של המוזיקאי</h1>
          <p className="mt-2 text-sm text-muted-foreground">כאן מנהלים את הקהילה: לקוחות, ספקים, לידים ומשימות — הכל במקום אחד.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<Users className="h-5 w-5" />} label="לקוחות פעילים" value={stats.activeCustomers} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="מכירות החודש" value={`₪${stats.monthlySales.toLocaleString()}`} />
          <StatCard icon={<ClipboardList className="h-5 w-5" />} label="לידים חדשים" value={stats.newLeads} highlight={stats.newLeads > 0} />
        </div>

        <Tabs defaultValue="dashboard" className="mt-8" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 h-auto sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2"><LayoutDashboard className="ml-1 h-4 w-4" /><span className="hidden sm:inline">דשבורד</span><span className="sm:hidden">בית</span></TabsTrigger>
            <TabsTrigger value="crm" className="text-xs sm:text-sm py-2"><Users className="ml-1 h-4 w-4" />CRM</TabsTrigger>
            <TabsTrigger value="commerce" className="text-xs sm:text-sm py-2"><ShoppingBag className="ml-1 h-4 w-4" /><span className="hidden sm:inline">חנות ושיווק</span><span className="sm:hidden">חנות</span></TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="crm" className="mt-6">
            <Tabs defaultValue="customers" dir="rtl">
              <div className="w-full overflow-x-auto scrollbar-thin [-webkit-overflow-scrolling:touch] touch-pan-x" dir="rtl">
                <TabsList className="inline-flex w-max h-auto gap-1 md:grid md:w-full md:grid-cols-7">
                  <TabsTrigger value="customers" className="shrink-0 md:flex-1"><Users className="ml-1 h-4 w-4" />לקוחות</TabsTrigger>
                  <TabsTrigger value="leads" className="shrink-0 md:flex-1"><ClipboardList className="ml-1 h-4 w-4" />לידים</TabsTrigger>
                  <TabsTrigger value="tasks" className="shrink-0 md:flex-1"><CheckCircle2 className="ml-1 h-4 w-4" />משימות</TabsTrigger>
                  <TabsTrigger value="suppliers" className="shrink-0 md:flex-1"><Building2 className="ml-1 h-4 w-4" />ספקים</TabsTrigger>
                  <TabsTrigger value="purchase_orders" className="shrink-0 md:flex-1"><Package className="ml-1 h-4 w-4" />רכש</TabsTrigger>
                  <TabsTrigger value="roles" className="shrink-0 md:flex-1"><KeyRound className="ml-1 h-4 w-4" />הרשאות</TabsTrigger>
                  <TabsTrigger value="admins" className="shrink-0 md:flex-1"><ShieldCheck className="ml-1 h-4 w-4" />מנהלים</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="customers" className="mt-6">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                    <CardTitle>לקוחות ({filteredCustomers.length})</CardTitle>
                    <div className="flex flex-1 items-center gap-2 max-w-md">
                      <Input placeholder="חיפוש..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                      <Select value={organFilter} onValueChange={setOrganFilter}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="דגם אורגן" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל הדגמים</SelectItem>
                          {ORGAN_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>שם</TableHead>
                          <TableHead>אימייל</TableHead>
                          <TableHead>טלפון</TableHead>
                          <TableHead>סוג</TableHead>
                          <TableHead>אורגן</TableHead>
                          <TableHead>מנוי</TableHead>
                          <TableHead className="text-end">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.display_name || c.full_name || "—"}</TableCell>
                            <TableCell>{c.email || "—"}</TableCell>
                            <TableCell>{c.phone || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{c.user_type}</Badge></TableCell>
                            <TableCell>{c.organ_model || "—"}</TableCell>
                            <TableCell><Badge>{c.subscription_tier}</Badge></TableCell>
                            <TableCell className="text-end">
                              <div className="flex justify-end gap-2">
                                <Button asChild size="sm" variant="ghost">
                                  <Link to="/admin/customers/$customerId" params={{ customerId: c.id }}>
                                    <Eye className="ml-1 h-4 w-4" />כרטיס 360°
                                  </Link>
                                </Button>
                                <CustomerEditDialog customer={c} onSaved={loadAll} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">אין לקוחות להצגה</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leads" className="mt-6">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>לידים ({leads.length})</CardTitle>
                    <LeadCreateDialog onSaved={loadAll} />
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>שם</TableHead>
                          <TableHead>אימייל</TableHead>
                          <TableHead>טלפון</TableHead>
                          <TableHead>מקור</TableHead>
                          <TableHead>סטטוס</TableHead>
                          <TableHead>תאריך</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell>{l.email || "—"}</TableCell>
                            <TableCell>{l.phone || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{l.source}</Badge></TableCell>
                            <TableCell><LeadStatusSelect lead={l} onChanged={loadAll} /></TableCell>
                            <TableCell>{new Date(l.created_at).toLocaleDateString("he-IL")}</TableCell>
                          </TableRow>
                        ))}
                        {leads.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">אין לידים להצגה</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-6">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>משימות ({tasks.length})</CardTitle>
                    <TaskEditDialog customers={customers} onSaved={loadAll} />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasks.map((t) => <TaskRow key={t.id} task={t} customers={customers} onChanged={loadAll} />)}
                      {tasks.length === 0 && <p className="py-8 text-center text-muted-foreground">אין משימות פעילות</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suppliers" className="mt-6">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                    <CardTitle>ספקים ({filteredSuppliers.length})</CardTitle>
                    <div className="flex items-center gap-2">
                      <Input placeholder="חיפוש..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} className="w-64" />
                      <SupplierEditDialog onSaved={loadAll} />
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>חברה</TableHead>
                          <TableHead>איש קשר</TableHead>
                          <TableHead>אימייל</TableHead>
                          <TableHead>טלפון</TableHead>
                          <TableHead>קטגוריה</TableHead>
                          <TableHead>סטטוס</TableHead>
                          <TableHead className="text-end">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSuppliers.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.company_name}</TableCell>
                            <TableCell>{s.contact_name || "—"}</TableCell>
                            <TableCell>{s.email || "—"}</TableCell>
                            <TableCell>{s.phone || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                            <TableCell>{s.is_active ? <Badge>פעיל</Badge> : <Badge variant="secondary">לא פעיל</Badge>}</TableCell>
                            <TableCell className="text-end"><SupplierEditDialog supplier={s} onSaved={loadAll} /></TableCell>
                          </TableRow>
                        ))}
                        {filteredSuppliers.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">אין ספקים להצגה</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="purchase_orders" className="mt-6">
                <SupplierOrdersManager />
              </TabsContent>

              <TabsContent value="roles" className="mt-6">
                <RolesPermissionsManager />
              </TabsContent>

              <TabsContent value="admins" className="mt-6">
                <AdminsManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="commerce" className="mt-6">
            <Tabs defaultValue="shop" dir="rtl">
              <TabsList className="flex w-full h-auto gap-1 overflow-x-auto justify-start md:grid md:grid-cols-9 scrollbar-thin [-webkit-overflow-scrolling:touch] touch-pan-x">
                <TabsTrigger value="shop" className="shrink-0 md:flex-1"><ShoppingBag className="ml-1 h-4 w-4" />חנות</TabsTrigger>
                <TabsTrigger value="rhythm_sets" className="shrink-0 md:flex-1"><Piano className="ml-1 h-4 w-4" />Rhythm Sets</TabsTrigger>
                <TabsTrigger value="marketplace" className="shrink-0 md:flex-1"><Tags className="ml-1 h-4 w-4" />יד 2</TabsTrigger>
                <TabsTrigger value="shorts" className="shrink-0 md:flex-1"><Play className="ml-1 h-4 w-4" />שורטס</TabsTrigger>
                <TabsTrigger value="music_pros" className="shrink-0 md:flex-1"><Music2 className="ml-1 h-4 w-4" />מוזיקאים</TabsTrigger>
                <TabsTrigger value="academy" className="shrink-0 md:flex-1"><GraduationCap className="ml-1 h-4 w-4" />אקדמיה</TabsTrigger>
                <TabsTrigger value="affiliates" className="shrink-0 md:flex-1"><Sparkles className="ml-1 h-4 w-4" />שותפים</TabsTrigger>
                <TabsTrigger value="automations" className="shrink-0 md:flex-1"><Zap className="ml-1 h-4 w-4" />אוטומציות</TabsTrigger>
                <TabsTrigger value="ai" className="shrink-0 md:flex-1"><Bot className="ml-1 h-4 w-4" />עוזרי AI</TabsTrigger>
                <TabsTrigger value="banners" className="shrink-0 md:flex-1"><Megaphone className="ml-1 h-4 w-4" />פרסומות</TabsTrigger>
              </TabsList>

              <TabsContent value="shop" className="mt-6">
                <ShopManager />
              </TabsContent>
              <TabsContent value="rhythm_sets" className="mt-6">
                <RhythmSetsManager />
              </TabsContent>
              <TabsContent value="marketplace" className="mt-6 space-y-6">
                <MarketplaceSettings />
                <MarketplaceCategoriesManager />
                <BusinessSellersManager />
                <MarketplaceManager />
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-500" />דיווחי משתמשים</CardTitle></CardHeader>
                  <CardContent><ReportsManager /></CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="shorts" className="mt-6">
                <ShortsManager />
              </TabsContent>
              <TabsContent value="music_pros" className="mt-6">
                <MusicProsManager />
              </TabsContent>
              <TabsContent value="academy" className="mt-6">
                <AcademyManager />
              </TabsContent>
              <TabsContent value="affiliates" className="mt-6 space-y-6">
                <AffiliatePayoutsManager />
                <AffiliatesManager />
              </TabsContent>
              <TabsContent value="automations" className="mt-6">
                <AutomationsManager />
              </TabsContent>
              <TabsContent value="ai" className="mt-6">
                <AiPromptsManager />
              </TabsContent>
              <TabsContent value="banners" className="mt-6">
                <BannersManager />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </section>
      </div>
    </SiteLayout>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/60 shadow-gold" : ""}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          {icon}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerEditDialog({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: customer.full_name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    user_type: customer.user_type,
    organ_model: customer.organ_model ?? "",
    subscription_tier: customer.subscription_tier,
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      phone: form.phone || null,
      email: form.email || null,
      user_type: form.user_type,
      organ_model: form.organ_model || null,
      subscription_tier: form.subscription_tier,
    }).eq("id", customer.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("הלקוח עודכן");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">עריכה</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>עריכת לקוח</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>שם מלא</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>אימייל</Label><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>טלפון</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>סוג משתמש</Label>
              <Select value={form.user_type} onValueChange={(v) => setForm({ ...form, user_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">לקוח</SelectItem>
                  <SelectItem value="supplier">ספק</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>רמת מנוי</Label>
              <Select value={form.subscription_tier} onValueChange={(v) => setForm({ ...form, subscription_tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">חינם</SelectItem>
                  <SelectItem value="basic">בסיסי</SelectItem>
                  <SelectItem value="premium">פרימיום</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>דגם אורגן</Label>
            <Select value={form.organ_model || "none"} onValueChange={(v) => setForm({ ...form, organ_model: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="בחר דגם" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {ORGAN_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadStatusSelect({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const update = async (status: string) => {
    const { error } = await supabase.from("leads").update({ status: status as "new" | "in_progress" | "converted" | "lost" }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };
  return (
    <Select value={lead.status} onValueChange={update}>
      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="new">חדש</SelectItem>
        <SelectItem value="in_progress">בטיפול</SelectItem>
        <SelectItem value="converted">הוסב</SelectItem>
        <SelectItem value="lost">אבד</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SupplierEditDialog({ supplier, onSaved }: { supplier?: Supplier; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: supplier?.company_name ?? "",
    contact_name: supplier?.contact_name ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    category: supplier?.category ?? "other",
    custom_category: (supplier as (Supplier & { custom_category?: string }) | undefined)?.custom_category ?? "",
    is_active: supplier?.is_active ?? true,
    payment_notes: supplier?.payment_notes ?? "",
  });

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("שם חברה חובה"); return; }
    if (form.category === "other" && !form.custom_category.trim()) {
      toast.error("פרט קטגוריה מותאמת");
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      category: form.category as "rhythms" | "equipment" | "courses" | "other",
      custom_category: form.category === "other" ? form.custom_category.trim() : null,
      is_active: form.is_active,
      payment_notes: form.payment_notes || null,
    };
    const { error } = supplier
      ? await supabase.from("suppliers").update(payload).eq("id", supplier.id)
      : await supabase.from("suppliers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(supplier ? "הספק עודכן" : "ספק נוסף");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier
          ? <Button size="sm" variant="outline">עריכה</Button>
          : <Button size="sm"><Plus className="ml-2 h-4 w-4" />ספק חדש</Button>}
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{supplier ? "עריכת ספק" : "ספק חדש"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>שם חברה *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>איש קשר</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rhythms">מקצבים</SelectItem>
                  <SelectItem value="equipment">ציוד</SelectItem>
                  <SelectItem value="courses">קורסים</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.category === "other" && (
            <div className="space-y-2">
              <Label>פרט קטגוריה</Label>
              <Input
                placeholder="לדוגמה: שירותי הקלטה"
                value={form.custom_category}
                onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
              />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>אימייל</Label><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>טלפון</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>הערות תשלום</Label><Textarea rows={3} value={form.payment_notes} onChange={(e) => setForm({ ...form, payment_notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskEditDialog({ customers, onSaved }: { customers: Customer[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "normal" as Task["priority"],
    due_date: "", related_customer_id: "none",
  });

  const save = async () => {
    if (!form.title.trim()) { toast.error("כותרת חובה"); return; }
    setSaving(true);
    const { error } = await supabase.from("admin_tasks").insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      related_customer_id: form.related_customer_id === "none" ? null : form.related_customer_id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("המשימה נוספה");
    setOpen(false);
    setForm({ title: "", description: "", priority: "normal", due_date: "", related_customer_id: "none" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="ml-2 h-4 w-4" />משימה חדשה</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>משימה חדשה</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>כותרת *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>תיאור</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>עדיפות</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחופה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>תאריך יעד</Label><Input type="date" dir="ltr" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>שייך ללקוח</Label>
            <Select value={form.related_customer_id} onValueChange={(v) => setForm({ ...form, related_customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name || c.full_name || c.email || c.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  urgent: "bg-destructive/20 text-destructive",
};

function TaskRow({ task, customers, onChanged }: { task: Task; customers: Customer[]; onChanged: () => void }) {
  const cycle = async () => {
    const next = task.status === "open" ? "in_progress" : task.status === "in_progress" ? "done" : "open";
    const { error } = await supabase.from("admin_tasks").update({ status: next }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };
  const remove = async () => {
    const { error } = await supabase.from("admin_tasks").delete().eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("המשימה נמחקה");
    onChanged();
  };
  const customer = customers.find((c) => c.id === task.related_customer_id);
  const Icon = task.status === "done" ? CheckCircle2 : task.status === "in_progress" ? Clock : Circle;

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border/60 p-3 ${task.status === "done" ? "opacity-60" : ""}`}>
      <button onClick={cycle} className="mt-0.5 text-primary hover:scale-110 transition-transform" aria-label="שינוי סטטוס">
        <Icon className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${task.status === "done" ? "line-through" : ""}`}>{task.title}</span>
          <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">{task.priority}</Badge>
          {customer && <Badge variant="outline">לקוח: {customer.display_name || customer.full_name || "—"}</Badge>}
          {task.due_date && <span className="text-xs text-muted-foreground">יעד: {new Date(task.due_date).toLocaleDateString("he-IL")}</span>}
        </div>
        {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
      </div>
      <Button size="sm" variant="ghost" onClick={remove} className="text-destructive">מחק</Button>
    </div>
  );
}

type AdminEntry = { user_id: string; email: string; granted_at: string };

function AdminsManager() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_admins");
    if (error) toast.error(error.message);
    setAdmins((data as AdminEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grant = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setAdding(true);
    const { error } = await supabase.rpc("admin_assign_role_by_email", {
      _email: e, _role: "admin", _revoke: false,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`הוקצתה הרשאת מנהל ל-${e}`);
    setEmail("");
    load();
  };

  const revoke = async (targetEmail: string) => {
    if (!confirm(`להסיר את הרשאת המנהל מ-${targetEmail}?`)) return;
    const { error } = await supabase.rpc("admin_assign_role_by_email", {
      _email: targetEmail, _role: "admin", _revoke: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("הרשאת המנהל הוסרה");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול מנהלים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/60 p-4">
          <Label className="mb-2 block">הוסף מנהל לפי אימייל</Label>
          <p className="mb-3 text-xs text-muted-foreground">
            המשתמש חייב להירשם תחילה למערכת. הזן את האימייל שלו והוא יקבל הרשאת מנהל.
          </p>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") grant(); }}
            />
            <Button onClick={grant} disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
              הענק הרשאה
            </Button>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">מנהלים נוכחיים ({admins.length})</h3>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>אימייל</TableHead>
                  <TableHead>הוענק בתאריך</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell dir="ltr">{a.email}</TableCell>
                    <TableCell>{new Date(a.granted_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell className="text-end">
                      {a.user_id === user?.id ? (
                        <Badge variant="outline">אתה</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(a.email)}>
                          <Trash2 className="ml-1 h-4 w-4" />הסר
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">אין מנהלים.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
