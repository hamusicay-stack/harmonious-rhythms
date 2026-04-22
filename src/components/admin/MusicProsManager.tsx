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
  is_verified: boolean; is_featured: boolean; subscription_tier: string;
  region: string | null; created_at: string;
};

type Inquiry = {
  id: string; pro_id: string; sender_name: string; contact_phone: string;
  event_type: string; event_date: string | null; status: string; created_at: string;
};

export function MusicProsManager() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("music_pros").select("id,user_id,display_name,status,is_verified,is_featured,subscription_tier,region,created_at").order("created_at", { ascending: false }),
      supabase.from("music_pro_inquiries").select("id,pro_id,sender_name,contact_phone,event_type,event_date,status,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    setPros((p as Pro[]) ?? []);
    setInquiries((i as Inquiry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Pro>) => {
    const { error } = await supabase.from("music_pros").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("עודכן");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק פרופיל זה?")) return;
    const { error } = await supabase.from("music_pros").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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
          <CardHeader><CardTitle>מוזיקאים מקצועיים</CardTitle></CardHeader>
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
                      <div className="flex gap-1">
                        {p.is_verified && <Badge className="bg-blue-500/15 text-blue-600"><ShieldCheck className="ml-1 h-3 w-3" />מאומת</Badge>}
                        {p.subscription_tier === "vip" && <Badge className="bg-amber-500/20 text-amber-700"><Crown className="ml-1 h-3 w-3" />VIP</Badge>}
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
                        <Button size="sm" variant="outline" onClick={() => update(p.id, { subscription_tier: p.subscription_tier === "vip" ? "free" : "vip" })}>
                          <Crown className="ml-1 h-3 w-3" />{p.subscription_tier === "vip" ? "FREE" : "VIP"}
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
                    <TableCell dir="ltr">{i.contact_phone}</TableCell>
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
