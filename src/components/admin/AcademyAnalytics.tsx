import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, TrendingDown, Eye } from "lucide-react";

type EventRow = {
  item_type: string;
  item_id: string;
  event_type: string;
  percent: number | null;
  created_at: string;
};

type AggregatedItem = {
  itemId: string;
  itemType: string;
  title: string;
  starts: number;
  completes: number;
  dropoffs: number;
  avgPercent: number;
  completionRate: number;
};

export function AcademyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AggregatedItem[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: events }, { data: lessons }, { data: podcasts }] = await Promise.all([
      supabase
        .from("academy_view_events")
        .select("item_type,item_id,event_type,percent,created_at")
        .gte("created_at", since)
        .limit(5000),
      supabase.from("academy_lessons").select("id,title"),
      supabase.from("academy_podcasts").select("id,title"),
    ]);

    const titleMap = new Map<string, string>();
    (lessons ?? []).forEach((l) => titleMap.set(`lesson:${l.id}`, l.title));
    (podcasts ?? []).forEach((p) => titleMap.set(`podcast:${p.id}`, p.title));

    const grouped = new Map<string, EventRow[]>();
    (events ?? []).forEach((e) => {
      const key = `${e.item_type}:${e.item_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e as EventRow);
    });

    const aggregated: AggregatedItem[] = [];
    grouped.forEach((rows, key) => {
      const [itemType, itemId] = key.split(":");
      const starts = rows.filter((r) => r.event_type === "start").length;
      const completes = rows.filter((r) => r.event_type === "complete").length;
      const dropoffs = rows.filter((r) => r.event_type === "dropoff").length;
      const percents = rows.map((r) => r.percent).filter((p): p is number => typeof p === "number");
      const avgPercent = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0;
      aggregated.push({
        itemId,
        itemType,
        title: titleMap.get(key) ?? "(לא נמצא)",
        starts,
        completes,
        dropoffs,
        avgPercent,
        completionRate: starts > 0 ? Math.round((completes / starts) * 100) : 0,
      });
    });

    aggregated.sort((a, b) => b.starts - a.starts);
    setItems(aggregated);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          עדיין אין נתוני צפייה. הנתונים יופיעו ברגע שמשתמשים יתחילו לצפות בקורסים ובפודקאסטים.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Eye />} label="סך התחלות (30 יום)" value={items.reduce((a, b) => a + b.starts, 0)} />
        <StatCard icon={<BarChart3 />} label="סך השלמות" value={items.reduce((a, b) => a + b.completes, 0)} />
        <StatCard icon={<TrendingDown />} label="נטישות" value={items.reduce((a, b) => a + b.dropoffs, 0)} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">פירוט לפי פריט</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.slice(0, 50).map((item) => (
            <div key={`${item.itemType}-${item.itemId}`} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {item.itemType === "lesson" ? "שיעור" : "פודקאסט"} · {item.starts} התחלות · {item.completes} השלמות
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-primary">{item.completionRate}%</div>
                <div className="text-[10px] text-muted-foreground">השלמה</div>
              </div>
              <div className="text-right shrink-0 w-14">
                <div className="text-sm font-bold">{item.avgPercent}%</div>
                <div className="text-[10px] text-muted-foreground">צפייה ממוצעת</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
