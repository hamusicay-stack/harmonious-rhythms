
function HardwareSmartOffers({ keyboardModelId }: { keyboardModelId: string | null }) {
  const [model, setModel] = useState<{ id: string; model_name: string; ui_image_url: string | null; brand_name?: string | null } | null>(null);
  const [offers, setOffers] = useState<Array<{ id: string; name: string; price: number | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!keyboardModelId) { setModel(null); setOffers([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from("keyboard_models")
        .select("id, model_name, ui_image_url, brands(name)")
        .eq("id", keyboardModelId)
        .maybeSingle() as { data: any };
      if (cancelled) return;
      const mm = m ? { id: m.id, model_name: m.model_name, ui_image_url: m.ui_image_url, brand_name: m.brands?.name ?? null } : null;
      setModel(mm);
      if (mm) {
        const { data: p } = await supabase
          .from("shop_products" as never)
          .select("id, name, price")
          .or(`name.ilike.%${mm.model_name}%,description.ilike.%${mm.model_name}%`)
          .limit(8) as { data: Array<{ id: string; name: string; price: number | null }> | null };
        if (!cancelled) setOffers(p ?? []);
      } else {
        setOffers([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [keyboardModelId]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Piano className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">חומרה משויכת</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!keyboardModelId ? (
            <div className="text-muted-foreground">לא נבחרה חומרה (keyboard_model_id ריק).</div>
          ) : loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : model ? (
            <div className="flex items-center gap-3">
              {model.ui_image_url && (
                <img src={model.ui_image_url} alt="" className="h-16 w-24 rounded object-cover" />
              )}
              <div>
                <div className="font-medium">{model.brand_name ? `${model.brand_name} · ` : ""}{model.model_name}</div>
                <code className="text-xs text-muted-foreground">{model.id}</code>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">דגם לא נמצא</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">הצעות חכמות (תואמות לחומרה)</CardTitle>
        </CardHeader>
        <CardContent>
          {!keyboardModelId ? (
            <div className="text-muted-foreground text-sm">אין חומרה — לא ניתן להציע מוצרים תואמים.</div>
          ) : loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : offers.length === 0 ? (
            <div className="text-muted-foreground text-sm">לא נמצאו מוצרים תואמים לדגם.</div>
          ) : (
            <div className="space-y-2">
              {offers.map(o => (
                <div key={o.id} className="rounded border border-border p-2 text-sm flex items-center justify-between">
                  <span className="truncate">{o.name}</span>
                  {o.price != null && <span className="text-primary font-medium shrink-0">₪{o.price}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
