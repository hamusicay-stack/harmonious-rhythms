import { friendlyError } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commerce/business-rules")({
  component: BusinessRulesPage,
});

type Tier = { id: string; slug: string; name: string; rank: number; is_vip: boolean; color: string | null };
type PType = { id: string; slug: string; name: string };
type Rule = { id?: string; tier_id: string; product_type_id: string; allowed: boolean; discount_percent: number };

function BusinessRulesPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [types, setTypes] = useState<PType[]>([]);
  const [rules, setRules] = useState<Map<string, Rule>>(new Map());
  const [loading, setLoading] = useState(true);
  const key = (t: string, p: string) => `${t}__${p}`;

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("subscription_tiers").select("id, slug, name, rank, is_vip, color").order("rank"),
      (supabase.from("product_types" as never) as any).select("id, slug, name").order("sort_order"),
      (supabase.from("business_rules" as never) as any).select("*"),
    ]);
    setTiers((t ?? []) as Tier[]);
    setTypes((p ?? []) as PType[]);
    const map = new Map<string, Rule>();
    for (const row of (r ?? []) as Rule[]) map.set(key(row.tier_id, row.product_type_id), row);
    setRules(map);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const upsertRule = async (tierId: string, ptId: string, patch: Partial<Rule>) => {
    const k = key(tierId, ptId);
    const existing = rules.get(k);
    const next: Rule = {
      ...(existing ?? { tier_id: tierId, product_type_id: ptId, allowed: true, discount_percent: 0 }),
      ...patch,
    };
    const map = new Map(rules); map.set(k, next); setRules(map);
    const { error, data } = await (supabase.from("business_rules" as never) as any)
      .upsert({
        tier_id: tierId, product_type_id: ptId,
        allowed: next.allowed, discount_percent: next.discount_percent,
      }, { onConflict: "tier_id,product_type_id" })
      .select().maybeSingle();
    if (error) { toast.error(friendlyError(error)); return; }
    if (data) { const m2 = new Map(map); m2.set(k, data as Rule); setRules(m2); }
  };

  const matrix = useMemo(() => {
    return tiers.map(t => ({
      tier: t,
      cells: types.map(p => ({ pt: p, rule: rules.get(key(t.id, p.id)) })),
    }));
  }, [tiers, types, rules]);

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>מטריצת כללי עסק — VIP × סוג מוצר</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">מקור אמת יחיד: <code>profiles.global_subscription_tier_id</code>. שינויים נכנסים לתוקף מיידית בכל המודולים (חנות, אקדמיה, פורום, יד 2).</p>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-end p-2 sticky end-0 bg-card">דרגה / סוג</th>
                    {types.map(p => (
                      <th key={p.id} className="p-2 text-center min-w-[140px]">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(row => (
                    <tr key={row.tier.id} className="border-t border-border">
                      <td className="p-2 sticky end-0 bg-card">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: row.tier.color ?? "var(--muted)" }} />
                          <span className="font-medium">{row.tier.name}</span>
                          {row.tier.is_vip && <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">VIP</span>}
                        </span>
                      </td>
                      {row.cells.map(({ pt, rule }) => (
                        <td key={pt.id} className="p-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={rule?.allowed ?? false}
                              onCheckedChange={v => upsertRule(row.tier.id, pt.id, { allowed: v })}
                            />
                            <Input
                              className="h-7 w-16 text-xs text-center"
                              type="number" placeholder="0%"
                              value={rule?.discount_percent ?? 0}
                              onChange={e => upsertRule(row.tier.id, pt.id, { discount_percent: Number(e.target.value) })}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {matrix.length === 0 && (
                    <tr><td colSpan={types.length + 1} className="p-4 text-center text-muted-foreground">צור סוגי מוצרים תחילה</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
