import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Download, Music, Lock, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Order = {
  id: string;
  status: string;
  cpi_file_url: string | null;
  cpi_file_path: string | null;
  created_at: string;
  completed_at: string | null;
  rhythm_set_id: string;
  rhythm_set?: { set_name: string; creator_name: string; description: string | null };
};

export function UserRhythmsDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("rhythm_orders" as any)
      .select("*, rhythm_set:rhythm_sets(set_name, creator_name, description)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("rhythm-orders-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "rhythm_orders" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const downloadCpi = async (order: Order) => {
    if (!order.cpi_file_path) {
      if (order.cpi_file_url) window.open(order.cpi_file_url, "_blank");
      return;
    }
    const { data, error } = await supabase.storage.from("rhythm-files").createSignedUrl(order.cpi_file_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Tabs defaultValue="rhythms" dir="rtl" className="w-full">
      <TabsList>
        <TabsTrigger value="rhythms"><Music className="ml-1 h-4 w-4" />הקצבים שלי</TabsTrigger>
      </TabsList>
      <TabsContent value="rhythms" className="mt-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">לא רכשת קצבים עדיין</CardContent></Card>
        ) : (
          orders.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {o.rhythm_set?.set_name ?? "קצב"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">יוצר: {o.rhythm_set?.creator_name}</p>
                </div>
                <StatusBadge status={o.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                {o.status === "processing" && (
                  <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                      <Loader2 className="relative h-6 w-6 animate-spin text-primary" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">בונים ומצפינים את קובץ ה-CPI המותאם שלך…</p>
                      <p className="text-muted-foreground text-xs mt-1">התהליך עשוי לקחת מעט זמן. נעדכן אותך מיד עם הסיום.</p>
                    </div>
                  </div>
                )}

                {o.status === "completed" && (
                  <>
                    <Button size="lg" className="w-full gap-2" onClick={() => void downloadCpi(o)}>
                      <Download className="h-5 w-5" />
                      הורד את קובץ ה-CPI שלך
                    </Button>
                    <Alert variant="destructive" className="border-destructive/50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-1"><Lock className="h-4 w-4" />שים לב</AlertTitle>
                      <AlertDescription className="text-xs leading-relaxed">
                        קובץ CPI זה מוצפן וקשור קריפטוגרפית אך ורק לקליד היאמהה הספציפי שלך. לא ניתן לשתף, להעביר או לטעון אותו על מכשיר אחר.
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {o.status === "failed" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>אירעה שגיאה בעיבוד ההזמנה. צוות התמיכה ייצור קשר.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-600 hover:bg-green-600">הושלם</Badge>;
  if (status === "processing") return <Badge variant="secondary" className="animate-pulse">בעיבוד</Badge>;
  if (status === "failed") return <Badge variant="destructive">נכשל</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
