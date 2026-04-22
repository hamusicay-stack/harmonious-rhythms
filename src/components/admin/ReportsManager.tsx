import { useEffect, useState } from "react";
import { Loader2, Flag, Check, X, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Report = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type Listing = { id: string; title: string; status: string; seller_id: string };
type Profile = { id: string; display_name: string | null; email: string | null };

const REASON_LABELS: Record<string, string> = {
  scam: "הונאה",
  inappropriate: "תוכן לא ראוי",
  duplicate: "כפול",
  wrong_category: "קטגוריה שגויה",
  sold: "כבר נמכר",
  other: "אחר",
};

export function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [reporters, setReporters] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");

  const load = async () => {
    setLoading(true);
    const { data: rep } = await supabase.from("marketplace_reports").select("*").order("created_at", { ascending: false });
    const reportsList = (rep ?? []) as Report[];
    const listingIds = Array.from(new Set(reportsList.map((r) => r.listing_id)));
    const reporterIds = Array.from(new Set(reportsList.map((r) => r.reporter_id)));
    const [{ data: ls }, { data: profs }] = await Promise.all([
      listingIds.length ? supabase.from("marketplace_listings").select("id, title, status, seller_id").in("id", listingIds) : Promise.resolve({ data: [] as Listing[] }),
      reporterIds.length ? supabase.from("profiles").select("id, display_name, email").in("id", reporterIds) : Promise.resolve({ data: [] as Profile[] }),
    ]);
    const lMap: Record<string, Listing> = {};
    (ls ?? []).forEach((l: any) => { lMap[l.id] = l; });
    const pMap: Record<string, Profile> = {};
    (profs ?? []).forEach((p: any) => { pMap[p.id] = p; });
    setListings(lMap);
    setReporters(pMap);
    setReports(reportsList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("marketplace_reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("הדיווח עודכן");
    load();
  };

  const removeListing = async (listingId: string) => {
    if (!confirm("למחוק את המודעה הזו לצמיתות?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", listingId);
    if (error) { toast.error(error.message); return; }
    toast.success("המודעה נמחקה");
    load();
  };

  const deleteReport = async (id: string) => {
    if (!confirm("למחוק את הדיווח?")) return;
    await supabase.from("marketplace_reports").delete().eq("id", id);
    load();
  };

  const filtered = reports.filter((r) => tab === "all" ? true : r.status === tab);
  const counts = {
    open: reports.filter((r) => r.status === "open").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="open">פתוחים ({counts.open})</TabsTrigger>
          <TabsTrigger value="reviewed">נבדקו ({counts.reviewed})</TabsTrigger>
          <TabsTrigger value="dismissed">נדחו ({counts.dismissed})</TabsTrigger>
          <TabsTrigger value="all">הכל</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">אין דיווחים בקטגוריה זו</div>
          ) : filtered.map((r) => {
            const l = listings[r.listing_id];
            const reporter = reporters[r.reporter_id];
            return (
              <div key={r.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-rose-500" />
                    <Badge variant="destructive">{REASON_LABELS[r.reason] || r.reason}</Badge>
                    <Badge variant={r.status === "open" ? "secondary" : r.status === "reviewed" ? "default" : "outline"}>
                      {r.status === "open" ? "פתוח" : r.status === "reviewed" ? "טופל" : "נדחה"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("he-IL")}</div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">מודעה: {l?.title || `(נמחקה — ${r.listing_id.slice(0, 8)})`}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    דווח ע"י: {reporter?.display_name || reporter?.email || r.reporter_id.slice(0, 8)}
                  </div>
                </div>
                {r.details && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{r.details}</div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {l && (
                    <a href={`/marketplace/${l.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline"><Eye className="h-3 w-3" />צפה במודעה</Button>
                    </a>
                  )}
                  {r.status === "open" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(r.id, "reviewed")}>
                        <Check className="h-3 w-3" />סמן כטופל
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "dismissed")}>
                        <X className="h-3 w-3" />דחה דיווח
                      </Button>
                    </>
                  )}
                  {l && (
                    <Button size="sm" variant="destructive" onClick={() => removeListing(l.id)}>
                      <Trash2 className="h-3 w-3" />מחק מודעה
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)}>
                    <Trash2 className="h-3 w-3" />מחק דיווח
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
