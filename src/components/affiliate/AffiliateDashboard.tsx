import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Copy, Check, TrendingUp, MousePointerClick, ShoppingBag, Wallet, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { buildAffiliateLink } from "@/lib/affiliate";
import { AffiliateApplyDialog } from "./AffiliateApplyDialog";

type Affiliate = {
  id: string; ref_code: string; commission_percent: number | null;
  total_earned: number; total_paid: number; total_clicks: number; total_conversions: number;
  is_active: boolean;
};
type Conversion = {
  id: string; scope_type: string; scope_id: string; order_amount: number;
  commission_amount: number; status: string; created_at: string;
};
type Application = { id: string; status: string; created_at: string };

const TARGETS = [
  { path: "/", label: "דף הבית" },
  { path: "/shop", label: "החנות" },
  { path: "/academy", label: "האקדמיה" },
  { path: "/pros", label: "מוזיקאים" },
];

export function AffiliateDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aff, setAff] = useState<Affiliate | null>(null);
  const [pendingApp, setPendingApp] = useState<Application | null>(null);
  const [convs, setConvs] = useState<Conversion[]>([]);
  const [defaultPct, setDefaultPct] = useState<number>(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: a }, { data: app }, { data: settings }] = await Promise.all([
      supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("affiliate_applications").select("id,status,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("affiliate_settings").select("default_commission_percent").eq("id", 1).maybeSingle(),
    ]);
    setAff(a as Affiliate | null);
    setPendingApp(app as Application | null);
    if (settings) setDefaultPct(Number(settings.default_commission_percent));

    if (a) {
      const { data: c } = await supabase.from("affiliate_conversions")
        .select("*").eq("affiliate_id", a.id).order("created_at", { ascending: false }).limit(20);
      setConvs((c ?? []) as Conversion[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("הקישור הועתק");
      setTimeout(() => setCopiedKey(null), 1500);
    } catch { toast.error("העתקה נכשלה"); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Not approved yet
  if (!aff) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            תוכנית השותפים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-primary-glow/5 p-5">
            <h3 className="font-display text-lg font-bold mb-1">הרווח עמלות מהפניות</h3>
            <p className="text-sm text-muted-foreground mb-3">
              קבל לינקים ייחודיים לכל מוצר באתר. רכישה דרך הלינק שלך = עמלה של עד {defaultPct}% בכיס שלך.
            </p>
            {pendingApp?.status === "pending" ? (
              <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30">
                <Clock className="ml-1 h-3 w-3" />הבקשה שלך ממתינה לאישור
              </Badge>
            ) : pendingApp?.status === "rejected" ? (
              <div className="space-y-2">
                <Badge variant="destructive"><XCircle className="ml-1 h-3 w-3" />נדחתה</Badge>
                <AffiliateApplyDialog onApplied={load}>
                  <Button size="sm" variant="outline">הגש בקשה חדשה</Button>
                </AffiliateApplyDialog>
              </div>
            ) : (
              <AffiliateApplyDialog onApplied={load}>
                <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                  <Sparkles className="ml-1 h-4 w-4" />הגש בקשה להצטרפות
                </Button>
              </AffiliateApplyDialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = Number(aff.commission_percent ?? defaultPct);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />הלוח שלי כשותף</span>
          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">פעיל · עמלה {pct}%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<MousePointerClick className="h-4 w-4" />} label="לחיצות" value={aff.total_clicks} />
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="המרות" value={aff.total_conversions} />
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="סך הרווחת" value={`₪${Number(aff.total_earned).toLocaleString()}`} />
          <Stat icon={<Wallet className="h-4 w-4" />} label="שולם" value={`₪${Number(aff.total_paid).toLocaleString()}`} />
        </div>

        {/* Ref code */}
        <div className="rounded-xl border bg-card-elevated p-4 space-y-2">
          <Label className="text-xs">קוד ההפניה הייחודי שלך</Label>
          <div className="flex gap-2">
            <Input value={aff.ref_code} readOnly className="font-mono text-center text-lg tracking-widest" />
            <Button variant="outline" onClick={() => copy(aff.ref_code, "code")}>
              {copiedKey === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <Label className="text-xs">קישורים מהירים</Label>
          {TARGETS.map((t) => {
            const url = buildAffiliateLink(aff.ref_code, t.path);
            return (
              <div key={t.path} className="flex items-center gap-2 rounded-lg border p-2">
                <span className="text-xs font-semibold w-24 shrink-0">{t.label}</span>
                <Input value={url} readOnly dir="ltr" className="text-xs font-mono" />
                <Button size="sm" variant="ghost" onClick={() => copy(url, t.path)}>
                  {copiedKey === t.path ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            💡 הוסף את הקוד שלך לכל קישור באתר כך: <code dir="ltr">?ref={aff.ref_code}</code>. העוגייה תקפה ל-30 יום.
          </p>
        </div>

        {/* Conversions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">המרות אחרונות</h4>
          {convs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg">אין עדיין המרות. שתף את הקישור שלך!</p>
          ) : (
            <div className="space-y-1">
              {convs.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-2 text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold">{c.scope_type}</span>
                    <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">₪{Number(c.order_amount).toFixed(0)}</span>
                    <span className="font-bold text-primary">+₪{Number(c.commission_amount).toFixed(0)}</span>
                    <Badge variant={c.status === "paid" ? "default" : "outline"} className="text-[10px]">
                      {c.status === "pending" ? "ממתין" : c.status === "approved" ? "אושר" : c.status === "paid" ? "שולם" : "נדחה"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
