
type PointsLedgerRow = {
  id: string;
  event_key: string;
  points: number;
  notes: string | null;
  created_at: string;
};

const POINTS_EVENT_LABELS: Record<string, string> = {
  shop_purchase: "רכישה בחנות",
  lesson_complete: "השלמת שיעור",
  course_complete: "השלמת קורס",
  forum_topic_create: "פתיחת אשכול",
  forum_post_create: "תגובה בפורום",
  forum_received_upvote: "הצבעה חיובית",
  forum_solution_accepted: "תשובה התקבלה כפתרון",
  forum_solution_marked: "סימון פתרון",
  marketplace_purchase: "רכישה ביד 2",
  marketplace_sale: "מכירה ביד 2",
  redeem_shop_order: "מימוש בחנות",
  daily_login: "כניסה יומית",
  manual_adjustment: "התאמה ידנית",
};

function PointsOverviewPanel({ customerId }: { customerId: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [rows, setRows] = useState<PointsLedgerRow[]>([]);
  const [earned30d, setEarned30d] = useState<number>(0);
  const [spent30d, setSpent30d] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [balRes, ledgerRes, recentRes] = await Promise.all([
        (supabase as any)
          .from("user_points")
          .select("total_points")
          .eq("user_id", customerId)
          .maybeSingle(),
        (supabase as any)
          .from("points_ledger")
          .select("id, event_key, points, notes, created_at")
          .eq("user_id", customerId)
          .order("created_at", { ascending: false })
          .limit(10),
        (supabase as any)
          .from("points_ledger")
          .select("points")
          .eq("user_id", customerId)
          .gte("created_at", since),
      ]);
      if (!alive) return;
      setBalance(Number(balRes.data?.total_points ?? 0));
      setRows((ledgerRes.data ?? []) as PointsLedgerRow[]);
      const recent = (recentRes.data ?? []) as { points: number }[];
      let plus = 0, minus = 0;
      for (const r of recent) {
        if (r.points >= 0) plus += r.points;
        else minus += r.points;
      }
      setEarned30d(plus);
      setSpent30d(Math.abs(minus));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [customerId]);

  return (
    <Card dir="rtl" className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> מבט מהיר על נקודות
          </span>
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500">
            יתרה: {balance ?? "—"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
            <div className="text-[11px] text-muted-foreground">נצברו (30 ימים)</div>
            <div className="text-lg font-bold text-emerald-500 tabular-nums">+{earned30d.toLocaleString("he-IL")}</div>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2">
            <div className="text-[11px] text-muted-foreground">מומשו (30 ימים)</div>
            <div className="text-lg font-bold text-rose-500 tabular-nums">-{spent30d.toLocaleString("he-IL")}</div>
          </div>
        </div>
        <div className="rounded-lg border border-border/60">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" /> טוען...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">אין עדיין תנועות נקודות</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const positive = r.points >= 0;
                const label = POINTS_EVENT_LABELS[r.event_key] ?? r.event_key;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("he-IL")}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={positive ? "border-emerald-500/40 text-emerald-500" : "border-rose-500/40 text-rose-500"}
                    >
                      {positive ? "+" : ""}{r.points.toLocaleString("he-IL")}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
