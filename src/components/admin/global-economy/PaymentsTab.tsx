import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CreditCard, Loader2, Save, Wallet } from "lucide-react";
import { toast } from "sonner";

type PaymentSettings = {
  id: number;
  test_mode: boolean;
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  local_gateway_enabled: boolean;
};

type ServicePricing = {
  service_key: string;
  label: string;
  price: number;
  is_active: boolean;
};

// Loose any to bypass stale generated types until they refresh.
const db = supabase as any;

export function PaymentsTab() {
  return (
    <div className="space-y-6">
      <GatewaysCard />
      <PricingCard />
    </div>
  );
}

// ============================================================================
// Section A — Gateways
// ============================================================================
function GatewaysCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["payment_settings"],
    queryFn: async (): Promise<PaymentSettings | null> => {
      const { data, error } = await db
        .from("payment_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutate = useMutation({
    mutationFn: async (patch: Partial<PaymentSettings>) => {
      const { error } = await db
        .from("payment_settings").update(patch).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_settings"] });
      toast.success("ההגדרות נשמרו");
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשמירת ההגדרות"),
  });

  if (isLoading || !data) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-950 to-zinc-900">
        <CardContent className="p-6 flex items-center justify-center text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />טוען הגדרות תשלום…
        </CardContent>
      </Card>
    );
  }

  const setFlag = (key: keyof PaymentSettings, value: boolean) =>
    mutate.mutate({ [key]: value } as Partial<PaymentSettings>);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-950 to-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-300">
          <CreditCard className="h-5 w-5" /> שערי סליקה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Master Test Mode */}
        <div
          className={`rounded-xl border-2 p-4 flex items-center justify-between gap-3 ${
            data.test_mode
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-emerald-500/40 bg-emerald-500/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`h-5 w-5 mt-0.5 ${data.test_mode ? "text-amber-400" : "text-emerald-400"}`}
            />
            <div>
              <div className="font-semibold text-zinc-100">
                מצב Sandbox / Test
                {data.test_mode ? (
                  <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-200 border-amber-500/40">פעיל</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2 bg-emerald-500/20 text-emerald-200 border-emerald-500/40">LIVE</Badge>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                כאשר פעיל, כל הסליקות מסומלצות. כבה רק לאחר בדיקות מלאות.
              </div>
            </div>
          </div>
          <Switch
            checked={data.test_mode}
            onCheckedChange={(v) => setFlag("test_mode", v)}
            disabled={mutate.isPending}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <GatewayToggle
            label="Stripe / Paddle"
            description="כרטיסי אשראי בינלאומיים"
            checked={data.stripe_enabled}
            disabled={mutate.isPending}
            onCheckedChange={(v) => setFlag("stripe_enabled", v)}
          />
          <GatewayToggle
            label="PayPal"
            description="ארנק דיגיטלי גלובלי"
            checked={data.paypal_enabled}
            disabled={mutate.isPending}
            onCheckedChange={(v) => setFlag("paypal_enabled", v)}
          />
          <GatewayToggle
            label="סליקה מקומית"
            description="קארדקום / משולם (IL)"
            checked={data.local_gateway_enabled}
            disabled={mutate.isPending}
            onCheckedChange={(v) => setFlag("local_gateway_enabled", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GatewayToggle(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/30 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-100 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-amber-300" /> {props.label}
        </div>
        <div className="text-xs text-zinc-400">{props.description}</div>
      </div>
      <Switch
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
        disabled={props.disabled}
      />
    </div>
  );
}

// ============================================================================
// Section B — Service Pricing
// ============================================================================
function PricingCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["service_pricing"],
    queryFn: async (): Promise<ServicePricing[]> => {
      const { data, error } = await db
        .from("service_pricing").select("*").order("service_key");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-950 to-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-300">תמחור שירותים</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center text-zinc-400 p-6">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />טוען מחירים…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-amber-500/20">
                <TableHead className="text-amber-200">מזהה</TableHead>
                <TableHead className="text-amber-200">תיאור</TableHead>
                <TableHead className="text-amber-200">מחיר (₪)</TableHead>
                <TableHead className="text-amber-200">פעיל</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((row) => (
                <PricingRow key={row.service_key} row={row} onSaved={() => qc.invalidateQueries({ queryKey: ["service_pricing"] })} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PricingRow({ row, onSaved }: { row: ServicePricing; onSaved: () => void }) {
  const [price, setPrice] = useState<string>(String(row.price));
  const [active, setActive] = useState<boolean>(row.is_active);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPrice(String(row.price)); setActive(row.is_active); }, [row.price, row.is_active]);

  const dirty = Number(price) !== Number(row.price) || active !== row.is_active;

  const save = async () => {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) { toast.error("מחיר לא תקין"); return; }
    setSaving(true);
    try {
      const { error } = await db.from("service_pricing")
        .update({ price: n, is_active: active })
        .eq("service_key", row.service_key);
      if (error) throw error;
      toast.success("נשמר");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow className="border-amber-500/10">
      <TableCell className="font-mono text-xs text-zinc-300">{row.service_key}</TableCell>
      <TableCell className="text-zinc-200">{row.label}</TableCell>
      <TableCell>
        <Input
          type="number" min={0} step="0.5"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 bg-black/40 border-amber-500/20"
        />
      </TableCell>
      <TableCell>
        <Switch checked={active} onCheckedChange={setActive} />
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={save} disabled={!dirty || saving}
          className="gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border border-amber-500/40">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          שמור
        </Button>
      </TableCell>
    </TableRow>
  );
}
