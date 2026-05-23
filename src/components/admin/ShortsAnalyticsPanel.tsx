import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Flame, TrendingUp, Activity, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VideoRow = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  views_count: number;
};

type LogRow = {
  video_id: string;
  seconds_watched: number;
  max_seconds_reached: number;
  rewatch_count: number | null;
  buffered_seconds: number | null;
  is_completed: boolean | null;
  session_id: string;
};

type VideoStats = {
  video: VideoRow;
  sessions: number;
  completions: number;
  completionRate: number;
  initialPlayRate: number;
  avgBuffer: number;
  qoeScore: number;
  reachBuckets: number[];
  rewatchBuckets: number[];
  dropoff: number[];
};

const BUCKETS = 20;

function bucketize(logs: LogRow[], duration: number): {
  reach: number[];
  rewatch: number[];
  dropoff: number[];
} {
  const reach = new Array(BUCKETS).fill(0);
  const rewatch = new Array(BUCKETS).fill(0);
  const reachedAtLeast = new Array(BUCKETS).fill(0);
  const safeDuration = duration > 0 ? duration : 30;

  logs.forEach((l) => {
    const pct = Math.min(l.max_seconds_reached / safeDuration, 1);
    const bucket = Math.min(Math.floor(pct * BUCKETS), BUCKETS - 1);
    reach[bucket] += 1;
    for (let i = 0; i <= bucket; i++) reachedAtLeast[i] += 1;
    const rw = l.rewatch_count ?? 0;
    if (rw > 0) rewatch[bucket] += rw;
  });

  const total = logs.length || 1;
  const dropoff = reachedAtLeast.map((c) => 1 - c / total);
  return { reach, rewatch, dropoff };
}

export function ShortsAnalyticsPanel() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [vRes, lRes] = await Promise.all([
        supabase
          .from("shorts_videos")
          .select("id, title, thumbnail_url, views_count")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("shorts_analytics_logs")
          .select("video_id, seconds_watched, max_seconds_reached, rewatch_count, buffered_seconds, is_completed, session_id")
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);
      setVideos(vRes.data ?? []);
      setLogs((lRes.data as LogRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const statsByVideo = useMemo(() => {
    const map = new Map<string, VideoStats>();
    videos.forEach((v) => {
      const vLogs = logs.filter((l) => l.video_id === v.id);
      const bySession = new Map<string, LogRow>();
      vLogs.forEach((l) => {
        const prev = bySession.get(l.session_id);
        if (!prev || l.max_seconds_reached > prev.max_seconds_reached) {
          bySession.set(l.session_id, l);
        }
      });
      const sessionLogs = Array.from(bySession.values());
      const sessions = sessionLogs.length;
      const completions = sessionLogs.filter((s) => s.is_completed).length;
      const played = sessionLogs.filter((s) => s.seconds_watched >= 1).length;
      const avgBuffer =
        sessionLogs.reduce((a, s) => a + (s.buffered_seconds ?? 0), 0) / Math.max(sessions, 1);
      const maxDuration = Math.max(
        ...sessionLogs.map((s) => s.max_seconds_reached),
        1,
      );
      const { reach, rewatch, dropoff } = bucketize(sessionLogs, maxDuration);
      map.set(v.id, {
        video: v,
        sessions,
        completions,
        completionRate: sessions ? (completions / sessions) * 100 : 0,
        initialPlayRate: sessions ? (played / sessions) * 100 : 0,
        avgBuffer,
        qoeScore: Math.max(0, 100 - Math.min(avgBuffer * 10, 100)),
        reachBuckets: reach,
        rewatchBuckets: rewatch,
        dropoff,
      });
    });
    return map;
  }, [videos, logs]);

  const aggregate = useMemo(() => {
    let totalSessions = 0;
    let totalCompletions = 0;
    let totalPlayed = 0;
    let totalBuffer = 0;
    statsByVideo.forEach((s) => {
      totalSessions += s.sessions;
      totalCompletions += s.completions;
      totalPlayed += (s.initialPlayRate / 100) * s.sessions;
      totalBuffer += s.avgBuffer * s.sessions;
    });
    return {
      sessions: totalSessions,
      completionRate: totalSessions ? (totalCompletions / totalSessions) * 100 : 0,
      initialPlayRate: totalSessions ? (totalPlayed / totalSessions) * 100 : 0,
      qoeScore: totalSessions
        ? Math.max(0, 100 - Math.min((totalBuffer / totalSessions) * 10, 100))
        : 100,
    };
  }, [statsByVideo]);

  const selected = selectedId ? statsByVideo.get(selectedId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Initial Play Rate"
          value={`${aggregate.initialPlayRate.toFixed(1)}%`}
          accent="from-amber-500/20 to-amber-500/5"
        />
        <KpiCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Completion Rate"
          value={`${aggregate.completionRate.toFixed(1)}%`}
          accent="from-emerald-500/20 to-emerald-500/5"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="QoE Buffer Score"
          value={`${aggregate.qoeScore.toFixed(0)} / 100`}
          accent="from-sky-500/20 to-sky-500/5"
        />
      </div>

      <Card className="border-amber-500/20 bg-gradient-to-b from-zinc-950/40 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-amber-400" />
            מפת חום לפי וידאו (Top 40)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {videos.length === 0 && (
            <p className="text-sm text-muted-foreground">אין סרטונים פעילים.</p>
          )}
          {videos.map((v) => {
            const s = statsByVideo.get(v.id);
            if (!s) return null;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                className={`w-full text-end rounded-lg border p-3 transition hover:bg-amber-500/5 ${
                  selectedId === v.id ? "border-amber-500/60 bg-amber-500/5" : "border-border/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="truncate font-medium text-sm">
                        {v.title || "ללא כותרת"}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {s.sessions} sessions
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                          {s.completionRate.toFixed(0)}% complete
                        </Badge>
                      </div>
                    </div>
                    <HeatmapStrip reach={s.reachBuckets} rewatches={s.rewatchBuckets} />
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selected.video.title || "ללא כותרת"} — דו"ח מלא
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
              סגירה
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <KpiCard label="Sessions" value={String(selected.sessions)} />
              <KpiCard label="Completion" value={`${selected.completionRate.toFixed(1)}%`} />
              <KpiCard label="QoE" value={`${selected.qoeScore.toFixed(0)}/100`} />
            </div>
            <div>
              <div className="text-xs mb-2 text-muted-foreground">
                Heatmap — אזורי זהב = ריצ'ים לרוב המשתמשים. פסי כתום-זוהר מסמנים פלחים שהושמעו שוב.
              </div>
              <HeatmapStrip
                reach={selected.reachBuckets}
                rewatches={selected.rewatchBuckets}
                tall
              />
            </div>
            <div>
              <div className="text-xs mb-2 text-muted-foreground">
                Drop-off Curve — אחוז הצופים שכבר נטשו בכל פלח של הקליפ.
              </div>
              <LineChart data={selected.dropoff} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border/40 p-3 bg-gradient-to-br ${
        accent ?? "from-muted/30 to-transparent"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function HeatmapStrip({
  reach,
  rewatches,
  tall,
}: {
  reach: number[];
  rewatches: number[];
  tall?: boolean;
}) {
  const maxReach = Math.max(...reach, 1);
  const maxRw = Math.max(...rewatches, 1);
  return (
    <div className={`flex gap-[2px] ${tall ? "h-14" : "h-6"}`}>
      {reach.map((r, i) => {
        const reachIntensity = r / maxReach;
        const rwIntensity = rewatches[i] / maxRw;
        const bg =
          rwIntensity > 0.2
            ? `rgba(251, 191, 36, ${0.4 + rwIntensity * 0.6})`
            : `rgba(244, 114, 22, ${0.15 + reachIntensity * 0.55})`;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ background: bg }}
            title={`Segment ${i + 1}/20 · reach ${r} · rewatches ${rewatches[i]}`}
          />
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: number[] }) {
  const w = 100;
  const h = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - v * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-20">
      <defs>
        <linearGradient id="dropfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(251,191,36)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(251,191,36)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#dropfill)" />
      <polyline points={pts} fill="none" stroke="rgb(251,191,36)" strokeWidth="0.6" />
    </svg>
  );
}
