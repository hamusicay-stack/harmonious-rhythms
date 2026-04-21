import { useEffect, useState } from "react";
import { Check, X, ShieldCheck, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Listing = {
  id: string; title: string; seller_id: string; category: string; brand: string | null;
  price: number; status: string; created_at: string; images: string[];
};
type Profile = { id: string; display_name: string | null; email: string | null };

export function MarketplaceManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [trusted, setTrusted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const load = async () => {
    setLoading(true);
    const { data: list } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((list ?? []).map((l: any) => l.seller_id)));
    const [{ data: profs }, { data: tr }] = await Promise.all([
      ids.length ? supabase.from("profiles").select("id, display_name, email").in("id", ids) : Promise.resolve({ data: [] as Profile[] }),
      supabase.from("marketplace_trusted_sellers").select("user_id"),
    ]);
    const profMap: Record<string, Profile> = {};
    (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    setProfiles(profMap);
    setTrusted(new Set((tr ?? []).map((t: any) => t.user_id)));
    setListings((list ?? []) as Listing[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("marketplace_listings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "המודעה אושרה ופורסמה" : status === "rejected" ? "המודעה נדחתה" : "עודכן");
    load();
  };

  const deleteListing = async (id: string) => {
    if (!confirm("למחוק את המודעה?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    load();
  };

  const toggleTrusted = async (userId: string) => {
    if (trusted.has(userId)) {
      await supabase.from("marketplace_trusted_sellers").delete().eq("user_id", userId);
      toast.success("התג הוסר");
    } else {
      await supabase.from("marketplace_trusted_sellers").insert({ user_id: userId, reason: "manual" });
      toast.success("המוכר סומן כנבחרת המוזיקאי");
    }
    load();
  };

  const filtered = listings.filter((l) => tab === "all" ? true : l.status === tab);
  const counts = {
    pending: listings.filter(l => l.status === "pending").length,
    approved: listings.filter(l => l.status === "approved").length,
    rejected: listings.filter(l => l.status === "rejected").length,
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">ממתין ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">פעיל ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">נדחה ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">הכל</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">אין מודעות בקטגוריה זו</div>
          ) : filtered.map((l) => {
            const seller = profiles[l.seller_id];
            const isTrusted = trusted.has(l.seller_id);
            return (
              <div key={l.id} className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                  {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">{l.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        מוכר: {seller?.display_name || seller?.email || l.seller_id.slice(0, 8)}
                        {isTrusted && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />נבחרת</Badge>}
                      </div>
                    </div>
                    <Badge variant={l.status === "approved" ? "default" : l.status === "pending" ? "secondary" : "destructive"}>
                      {l.status === "pending" ? "ממתין" : l.status === "approved" ? "פעיל" : l.status === "rejected" ? "נדחה" : "נמכר"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{l.brand} · ₪{Number(l.price).toLocaleString()}</div>
                  <div className="flex gap-2 flex-wrap pt-2">
                    <a href={`/marketplace/${l.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline"><Eye className="h-3 w-3" />צפה</Button>
                    </a>
                    {l.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(l.id, "approved")}><Check className="h-3 w-3" />אשר</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, "rejected")}><X className="h-3 w-3" />דחה</Button>
                      </>
                    )}
                    {l.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, "pending")}>החזר לממתין</Button>
                    )}
                    <Button size="sm" variant={isTrusted ? "secondary" : "outline"} onClick={() => toggleTrusted(l.seller_id)}>
                      <ShieldCheck className="h-3 w-3" />{isTrusted ? "הסר נבחרת" : "סמן כנבחרת"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteListing(l.id)}>
                      <Trash2 className="h-3 w-3" />מחק
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
