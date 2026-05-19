import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Crown, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Pro = {
  id: string; user_id: string; display_name: string; status: string;
  is_verified: boolean; is_featured: boolean;
  region: string | null; created_at: string;
  // SSoT join via profiles.global_subscription_tier_id
  tier_id: string | null;
  tier_name: string | null;
  tier_is_vip: boolean;
};

type Inquiry = {
  id: string; pro_id: string; sender_name: string; contact_phone: string;
  event_type: string; event_date: string | null; status: string; created_at: string;
};

type Tier = { id: string; slug: string; name: string; is_vip: boolean };

export function MusicProsManager() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [vipTier, setVipTier] = useState<Tier | null>(null);
  const [freeTier, setFreeTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: i }, { data: t }] = await Promise.all([
      supabase.from("music_pros").select("id,user_id,display_name,status,is_verified,is_featured,region,created_at").order("created_at", { ascending: false }),
      supabase.from("music_pro_inquiries").select("id,pro_id,sender_name,contact_phone,event_type,event_date,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("subscription_tiers").select("id,slug,name,is_vip").order("rank"),
    ]);
    const ts = (t as Tier[]) ?? [];
    setTiers(ts);
    setVipTier(ts.find(x => x.is_vip) ?? null);
    setFreeTier(ts.find(x => x.slug === "free") ?? null);

    // Pull global tier per pro user from profiles (SSoT)
    const userIds = ((p ?? []) as { user_id: string }[]).map(r => r.user_id).filter(Boolean);
    const tierByUser = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, global_subscription_tier_id")
        .in("id", userIds);
      for (const pr of (profs ?? []) as { id: string; global_subscription_tier_id: string | null }[]) {
        tierByUser.set(pr.id, pr.global_subscription_tier_id);
      }
    }
    const tierById = new Map(ts.map(x => [x.id, x] as const));
    const enriched: Pro[] = ((p ?? []) as Pro[]).map(r => {
      const tid = tierByUser.get(r.user_id) ?? null;
      const tier = tid ? tierById.get(tid) : undefined;
      return { ...r, tier_id: tid, tier_name: tier?.name ?? null, tier_is_vip: !!tier?.is_vip };
    });
    setPros(enriched);
    setInquiries((i as Inquiry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Pro>) => {
    const { error } = await supabase.from("music_pros").update(patch).eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("עודכן");
    load();
  };

  const toggleVipGlobal = async (pro: Pro) => {
    if (!vipTier) { toast.error("לא הוגדרה דרגת VIP במערכת"); return; }
    const targetTierId = pro.tier_is_vip ? (freeTier?.id ?? null) : vipTier.id;
    const { error } = await (supabase as never as {
      rpc: (n: string, args: { _user_id: string; _tier_id: string | null }) => Promise<{ error: { message: string } | null }>;
    }).rpc("admin_set_user_global_tier", { _user_id: pro.user_id, _tier_id: targetTierId });
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(pro.tier_is_vip ? "VIP הוסר" : "VIP הוענק");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק פרופיל זה?")) return;
    const { error } = await supabase.from("music_pros").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("נמחק");
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Tabs defaultValue="profiles">
      <TabsList>
        <TabsTrigger value="profiles">פרופילים ({pros.length})</TabsTrigger>
        <TabsTrigger value="inquiries">בקשות ({inquiries.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="profiles" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>מוזיקאים מקצועיים</CardTitle>
            <p className="text-xs text-muted-foreground">דרגות VIP נשלטות דרך המקור היחיד: <code>profiles.global_subscription_tier_id</code></p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>אזור</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>תגים</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pros.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.display_name}</TableCell>
                    <TableCell>{p.region || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "approved" ? "default" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.is_verified && <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary"><ShieldCheck className="ml-1 h-3 w-3" />מאומת</Badge>}
                        {p.tier_is_vip && <Badge className="bg-primary text-primary-foreground"><Crown className="ml-1 h-3 w-3" />{p.tier_name ?? "VIP"}</Badge>}
                        {!p.tier_is_vip && p.tier_name && <Badge variant="outline" className="text-muted-foreground">{p.tier_name}</Badge>}
                        {p.is_featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap justify-end gap-1">
                        {p.status !== "approved" ? (
                          <Button size="sm" variant="outline" onClick={() => update(p.id, { status: "approved" })}>
                            <Check className="ml-1 h-3 w-3" />אשר
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => update(p.id, { status: "suspended" })}>
                            <X className="ml-1 h-3 w-3" />הקפא
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => update(p.id, { is_verified: !p.is_verified })}>
                          <ShieldCheck className="ml-1 h-3 w-3" />{p.is_verified ? "בטל אימות" : "אמת"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleVipGlobal(p)}>
                          <Crown className="ml-1 h-3 w-3" />{p.tier_is_vip ? "הסר VIP" : "הענק VIP"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pros.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">אין פרופילים.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inquiries" className="mt-4">
        <Card>
          <CardHeader><CardTitle>בקשות הצעת מחיר</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שולח</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>סוג אירוע</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.sender_name}</TableCell>
                    <TableCell>{i.contact_phone}</TableCell>
                    <TableCell>{i.event_type}</TableCell>
                    <TableCell>{i.event_date ? new Date(i.event_date).toLocaleDateString("he-IL") : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {inquiries.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">אין בקשות.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

