import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronDown, Loader2, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export type CatalogMatch = {
  id: string;
  brand: string;
  model: string;
  category: string;
  subcategory: string | null;
  specifications: Record<string, string>;
};

type Props = {
  category?: string;
  brand: string;
  model: string;
  customBrand: string;
  onBrandChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onCustomBrandChange: (v: string) => void;
  onCatalogMatch: (specs: Record<string, string> | null) => void;
};

export function EquipmentAutoSuggest({
  category, brand, model, customBrand,
  onBrandChange, onModelChange, onCustomBrandChange, onCatalogMatch,
}: Props) {
  const [query, setQuery] = useState(() => [brand, model].filter(Boolean).join(" "));
  const [results, setResults] = useState<CatalogMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [matched, setMatched] = useState<CatalogMatch | null>(null);
  const [manual, setManual] = useState(brand === "אחר");
  const [specsOpen, setSpecsOpen] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  // Click-away to close dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Debounced search
  useEffect(() => {
    if (manual || matched) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      let req = supabase
        .from("equipment_catalog")
        .select("id,brand,model,category,subcategory,specifications")
        .or(`brand.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(8);
      if (category) req = req.eq("category", category);
      const { data } = await req;
      setResults((data ?? []) as CatalogMatch[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, category, manual, matched]);

  const handlePick = (item: CatalogMatch) => {
    setMatched(item);
    setQuery(`${item.brand} ${item.model}`);
    onBrandChange(item.brand);
    onModelChange(item.model);
    onCatalogMatch(item.specifications);
    setOpen(false);
    setManual(false);
  };

  const clearMatch = () => {
    setMatched(null);
    onCatalogMatch(null);
    setQuery("");
    onBrandChange("");
    onModelChange("");
  };

  const switchToManual = () => {
    setManual(true);
    setMatched(null);
    onCatalogMatch(null);
    onBrandChange("אחר");
    onModelChange("");
  };

  const specEntries = useMemo(
    () => matched ? Object.entries(matched.specifications || {}) : [],
    [matched]
  );

  if (manual) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>יצרן ודגם</Label>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setManual(false); onBrandChange(""); }}>
            <Search className="ms-1 h-3.5 w-3.5" /> חזור לחיפוש בקטלוג
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">שם היצרן *</Label>
            <Input value={customBrand} onChange={(e) => onCustomBrandChange(e.target.value)} placeholder="יצרן מותאם אישית" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">דגם</Label>
            <Input value={model} onChange={(e) => onModelChange(e.target.value)} placeholder="דגם מותאם אישית" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={boxRef}>
      <Label className="flex items-center gap-2">
        יצרן ודגם <span className="text-destructive">*</span>
        <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
          <Sparkles className="ms-1 h-3 w-3" /> קטלוג מאומת
        </Badge>
      </Label>

      <div className="relative">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (matched) { setMatched(null); onCatalogMatch(null); } setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="התחל להקליד יצרן או דגם (לדוגמה: Fender Stratocaster)"
          className="pe-9"
        />
        {matched && (
          <button type="button" onClick={clearMatch} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {open && !matched && query.trim().length >= 2 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> מחפש בקטלוג…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground">לא נמצאו תוצאות בקטלוג</div>
            )}
            {!loading && results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handlePick(r)}
                className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-end text-sm last:border-b-0 hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    {r.brand} <span className="text-muted-foreground">·</span> {r.model}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {Object.entries(r.specifications || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={switchToManual}
              className="block w-full border-t bg-muted/30 px-3 py-2 text-end text-sm font-medium text-primary hover:bg-muted"
            >
              אחר / דגם מותאם אישית
            </button>
          </div>
        )}
      </div>

      {matched && (
        <div className="rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-3">
          <button
            type="button"
            onClick={() => setSpecsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-end"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" /> מפרט טכני רשמי מאומת
            </span>
            <ChevronDown className={`h-4 w-4 text-primary transition-transform ${specsOpen ? "rotate-180" : ""}`} />
          </button>
          {specsOpen && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {specEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/40 py-1">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
