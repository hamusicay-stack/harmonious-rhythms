import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Piano, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin1/crm")({
  component: CrmPage,
});

type Customer = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  has_whatsapp: boolean | null;
  keyboard_model_id: string | null;
  global_subscription_tier_id: string | null;
};

type KModel = { id: string; brand_id: string; model_name: string; ui_image_url: string | null };

function CrmPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [models, setModels] = useState<Map<string, KModel>>(new Map());
  const [tierNames, setTierNames] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<Customer | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Array<{ id: string; name: string; price: number | null }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: m }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, email, phone, has_whatsapp, keyboard_model_id, global_subscription_tier_id").order("created_at", { ascending: false }).limit(200),
        supabase.from("keyboard_models").select("id, brand_id, model_name, ui_image_url"),
        supabase.from("subscription_tiers").select("id, name"),
      ]);
      setCustomers((c ?? []) as Customer[]);
      const mm = new Map<string, KModel>(); for (const k of (m ?? []) as KModel[]) mm.set(k.id, k); setModels(mm);
      const tt = new Map<string, string>(); for (const r of (t ?? []) as { id: string; name: string }[]) tt.set(r.id, r.name); setTierNames(tt);
      setLoading(false);
    })();
  }, []);

  // Smart offers based on selected customer's hardware
  useEffect(() => {
    if (!selected?.keyboard_model_id) { setOffers([]); return; }
    (async () => {
      const model = models.get(selected.keyboard_model_id!);
      if (!model) { setOffers([]); return; }
      // Match shop products by model_name keyword in name/description
      const { data } = await supabase
        .from("shop_products" as never)
        .select("id, name, price")
        .or(`name.ilike.%${model.model_name}%,description.ilike.%${model.model_name}%`)
        .limit(8) as { data: Array<{ id: string; name: string; price: number | null }> | null };
      setOffers(data ?? []);
    })();
  }, [selected, models]);

  const filtered = customers.filter(c => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.display_name ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s) || (c.phone ?? "").includes(s);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>לקוחות</CardTitle></CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pr-8" placeholder="חיפוש..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map(c => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full text-right rounded-md px-2 py-2 text-sm hover:bg-accent transition ${selected?.id === c.id ? "bg-accent" : ""}`}>
                  <div className="font-medium">{c.display_name ?? "ללא שם"}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {!selected ? (
          <Card><CardContent className="p-6 text-muted-foreground">בחר לקוח מהרשימה</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>פרופיל לקוח 360</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><b>שם:</b> {selected.display_name ?? "—"}</div>
                <div><b>אימייל:</b> {selected.email ?? "—"}</div>
                <div className="flex items-center gap-2"><b>טלפון:</b> {selected.phone ?? "—"}
                  {selected.has_whatsapp ? <Badge className="bg-green-600">WhatsApp</Badge> : <Badge variant="secondary">Email Fallback</Badge>}
                </div>
                <div><b>דרגת VIP:</b> {selected.global_subscription_tier_id ? tierNames.get(selected.global_subscription_tier_id) ?? "—" : "—"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Piano className="h-5 w-5 text-primary" />
                <CardTitle>חומרה משויכת</CardTitle>
              </CardHeader>
              <CardContent>
                {selected.keyboard_model_id && models.get(selected.keyboard_model_id) ? (
                  <div className="flex items-center gap-3">
                    {models.get(selected.keyboard_model_id)!.ui_image_url && (
                      <img src={models.get(selected.keyboard_model_id)!.ui_image_url!} alt="" className="h-16 w-24 object-cover rounded" />
                    )}
                    <div>
                      <div className="font-medium">{models.get(selected.keyboard_model_id)!.model_name}</div>
                      <code className="text-xs text-muted-foreground">{selected.keyboard_model_id}</code>
                    </div>
                  </div>
                ) : <div className="text-muted-foreground">לא נבחרה חומרה</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>הצעות חכמות</CardTitle>
              </CardHeader>
              <CardContent>
                {!selected.keyboard_model_id ? (
                  <div className="text-muted-foreground text-sm">אין חומרה — לא ניתן להציע מוצרים תואמים.</div>
                ) : offers.length === 0 ? (
                  <div className="text-muted-foreground text-sm">לא נמצאו מוצרים תואמים לדגם.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {offers.map(o => (
                      <div key={o.id} className="rounded border border-border p-2 text-sm flex items-center justify-between">
                        <span>{o.name}</span>
                        {o.price != null && <span className="text-primary font-medium">₪{o.price}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
