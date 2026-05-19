import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getEntitlementControlPlane,
  setEntitlementModeOnServer,
  updateControlPlane,
  subscribeToControlPlaneChanges,
  getDriftSnapshot,
  onEntitlementDrift,
  getEntitlementMismatchReport,
  getEntitlementHealth,
  type ControlPlaneConfig,
  type EntitlementMode,
  type DriftSnapshot,
  type EntitlementMismatchReport,
  type EntitlementHealth,
} from "@/lib/entitlements";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertTriangle, ShieldAlert, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/entitlements-control")({
  head: () => ({
    meta: [
      { title: "בקרת הרשאות — ניהול" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EntitlementsControlPage,
});

type AuditRow = {
  id: string;
  action_type: string;
  previous_mode: string | null;
  new_mode: string | null;
  metadata: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

function EntitlementsControlPage() {
  const { user } = useAuth();
  const [cp, setCp] = useState<ControlPlaneConfig | null>(null);
  const [drift, setDrift] = useState<DriftSnapshot>(() => getDriftSnapshot());
  const [report, setReport] = useState<EntitlementMismatchReport>(() => getEntitlementMismatchReport());
  const [health, setHealth] = useState<EntitlementHealth>(() => getEntitlementHealth());
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMode, setPendingMode] = useState<EntitlementMode | null>(null);
  const [rolloutDraft, setRolloutDraft] = useState<number>(0);
  const [savingRollout, setSavingRollout] = useState(false);

  useEffect(() => {
    void (async () => {
      const c = await getEntitlementControlPlane({ force: true });
      setCp(c);
      setRolloutDraft(c.rollout_percentage);
      setLoading(false);
    })();
    const unsubCp = subscribeToControlPlaneChanges((c) => {
      setCp(c);
      setRolloutDraft(c.rollout_percentage);
    });
    const unsubDrift = onEntitlementDrift((s) => {
      setDrift(s);
      setReport(getEntitlementMismatchReport());
    });
    void loadAudit().then(setAudit);
    const t = setInterval(() => {
      setDrift(getDriftSnapshot());
      setReport(getEntitlementMismatchReport());
      setHealth(getEntitlementHealth());
    }, 4000);
    return () => { unsubCp(); unsubDrift(); clearInterval(t); };
  }, []);

  async function loadAudit(): Promise<AuditRow[]> {
    try {
      const { data } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AuditRow[] | null }>;
            };
          };
        };
      })
        .from("entitlement_audit_log")
        .select("id, action_type, previous_mode, new_mode, metadata, actor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    } catch { return []; }
  }

  async function confirmModeChange() {
    if (!pendingMode || !cp) return;
    try {
      await setEntitlementModeOnServer(pendingMode, user?.id ?? null);
      toast.success(`Mode set to ${pendingMode}`);
      setAudit(await loadAudit());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPendingMode(null);
    }
  }

  async function saveRollout() {
    if (!cp) return;
    setSavingRollout(true);
    try {
      await updateControlPlane({ rollout_percentage: rolloutDraft }, user?.id ?? null);
      toast.success(`Rollout: ${rolloutDraft}%`);
      setAudit(await loadAudit());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingRollout(false);
    }
  }

  async function toggleAutoRollback(v: boolean) {
    if (!cp) return;
    try {
      await updateControlPlane({ allow_auto_rollback: v }, user?.id ?? null);
      toast.success(v ? "Auto-rollback enabled" : "Auto-rollback disabled");
      setAudit(await loadAudit());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading || !cp) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const status = computeStatus(drift, cp);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">בקרת הרשאות (Entitlements Control Plane)</h1>
          <p className="text-sm text-muted-foreground">Server-driven authority for legacy/dual/SSoT modes. כל שינוי נרשם ביומן.</p>
        </div>
        <Badge variant="outline" className={status.badgeClass}>
          <StatusIcon className="me-1 h-3.5 w-3.5" /> {status.label}
        </Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Mode פעיל</div>
          <div className="mt-1 text-2xl font-semibold uppercase">{cp.mode}</div>
          <div className="mt-3 flex gap-2">
            {(["legacy","dual","ssot"] as EntitlementMode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={cp.mode === m ? "default" : "outline"}
                onClick={() => setPendingMode(m)}
              >{m}</Button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Mismatch rate</div>
          <div className="mt-1 text-2xl font-semibold">{(drift.rate * 100).toFixed(2)}%</div>
          <div className="text-xs text-muted-foreground">
            {drift.total} samples • confidence {(drift.confidence * 100).toFixed(0)}%
          </div>
          <div className="mt-2 text-xs">Recommendation: <span className="font-medium">{drift.recommendation}</span></div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Top hotspot</div>
          <div className="mt-1 text-lg font-semibold">{drift.topHotspot ?? "—"}</div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Switch checked={cp.allow_auto_rollback} onCheckedChange={toggleAutoRollback} id="auto-rb" />
            <label htmlFor="auto-rb" className="text-xs text-muted-foreground">Auto-rollback בעת drift קריטי</label>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Rollout (SSoT primary share)</h2>
            <p className="text-xs text-muted-foreground">משתמשים בנתח זה ייערכו ב-SSoT primary. השאר נשארים legacy/dual.</p>
          </div>
          <span className="text-2xl font-semibold">{rolloutDraft}%</span>
        </div>
        <div className="mt-4">
          <Slider value={[rolloutDraft]} onValueChange={(v) => setRolloutDraft(v[0] ?? 0)} max={100} step={5} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={savingRollout || rolloutDraft === cp.rollout_percentage} onClick={saveRollout}>
            {savingRollout && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}שמירה
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Hotspots (top 5)</h2>
        <div className="space-y-2 text-sm">
          {report.hotspots.slice(0, 5).map((h) => (
            <div key={h.module} className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-mono text-xs">{h.module}</span>
              <span className="text-xs text-muted-foreground">{h.mismatches}/{h.total} ({(h.rate * 100).toFixed(1)}%)</span>
            </div>
          ))}
          {report.hotspots.length === 0 && <div className="text-xs text-muted-foreground">No mismatches recorded yet.</div>}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">System Health</h2>
          <Badge
            variant="outline"
            className={
              health.status === "red"
                ? "border-destructive text-destructive"
                : health.status === "yellow"
                ? "border-yellow-500 text-yellow-500"
                : "border-emerald-500 text-emerald-500"
            }
          >
            <Activity className="me-1 h-3.5 w-3.5" />
            {health.status === "red" ? "RED — safety mode" : health.status === "yellow" ? "YELLOW — degraded" : "GREEN — stable"}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Cache hit %</div>
            <div className="text-lg font-semibold">{(health.cacheHitRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Avg latency</div>
            <div className="text-lg font-semibold">{health.avgLatency.toFixed(0)} ms</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Anomalies</div>
            <div className="text-lg font-semibold">{health.anomalyCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Rate-limit hits</div>
            <div className="text-lg font-semibold">{health.rateLimitHits}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Safety mode</div>
            <div className="text-lg font-semibold">{health.safetyModeStatus ? "ON" : "off"}</div>
          </div>
        </div>
        {health.details.anomaly.recent.length > 0 && (
          <div className="mt-3 space-y-1 text-xs">
            <div className="text-muted-foreground">Recent anomalies:</div>
            {health.details.anomaly.recent.slice(-5).reverse().map((a, i) => (
              <div key={i} className="flex justify-between border-b border-border/40 py-1">
                <span className="font-mono">{a.type}</span>
                <span className="text-muted-foreground">{a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Audit log (100 אחרונים)</h2>
        <div className="max-h-96 overflow-auto text-xs">
          <table className="w-full">
            <thead className="text-muted-foreground">
              <tr><th className="text-start pb-2">When</th><th className="text-start">Action</th><th className="text-start">Prev → New</th><th className="text-start">Actor</th></tr>
            </thead>
            <tbody>
              {audit.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="py-1.5">{new Date(r.created_at).toLocaleString("he-IL")}</td>
                  <td>{r.action_type}</td>
                  <td>{r.previous_mode ?? "—"} → {r.new_mode ?? "—"}</td>
                  <td className="font-mono">{r.actor_id?.slice(0, 8) ?? "system"}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!pendingMode} onOpenChange={(o) => !o && setPendingMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>אישור שינוי mode</DialogTitle>
            <DialogDescription>
              לשנות את ה-Entitlements mode מ-<strong>{cp.mode}</strong> ל-<strong>{pendingMode}</strong>?
              הפעולה תופעל לכל המשתמשים מיידית ותירשם ביומן ביקורת.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMode(null)}>ביטול</Button>
            <Button onClick={confirmModeChange}>אישור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeStatus(d: DriftSnapshot, cp: ControlPlaneConfig) {
  if (d.rate >= cp.drift_threshold_rollback && d.total >= 25) {
    return { label: "RED — rollback recommended", icon: ShieldAlert, badgeClass: "border-destructive text-destructive" };
  }
  if (d.rate >= cp.drift_threshold_warning && d.total >= 25) {
    return { label: "YELLOW — drift detected", icon: AlertTriangle, badgeClass: "border-yellow-500 text-yellow-500" };
  }
  return { label: "GREEN — stable", icon: ShieldCheck, badgeClass: "border-emerald-500 text-emerald-500" };
}
