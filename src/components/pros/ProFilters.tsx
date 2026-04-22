import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GENRES, REGIONS, SPECIALTIES } from "@/lib/prosData";
import { X } from "lucide-react";

export type ProFiltersState = {
  search: string;
  specialties: string[];
  genres: string[];
  region: string;
  city: string;
  priceMax: number;
  verifiedOnly: boolean;
  vipOnly: boolean;
};

export const DEFAULT_FILTERS: ProFiltersState = {
  search: "",
  specialties: [],
  genres: [],
  region: "",
  city: "",
  priceMax: 10000,
  verifiedOnly: false,
  vipOnly: false,
};

type Props = {
  value: ProFiltersState;
  onChange: (v: ProFiltersState) => void;
};

export function ProFilters({ value, onChange }: Props) {
  const toggle = (key: "specialties" | "genres", v: string) => {
    const has = value[key].includes(v);
    onChange({ ...value, [key]: has ? value[key].filter((x) => x !== v) : [...value[key], v] });
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 text-right">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">סינון</h3>
        <Button variant="ghost" size="sm" onClick={reset}>
          <X className="ml-1 h-3.5 w-3.5" /> נקה הכל
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-xs">חיפוש חופשי</Label>
          <Input
            placeholder="שם / תיאור..."
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs">התמחות</Label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggle("specialties", s.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-all ${
                  value.specialties.includes(s.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-xs">סגנון</Label>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => toggle("genres", g.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-all ${
                  value.genres.includes(g.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1.5 block text-xs">אזור</Label>
            <select
              value={value.region}
              onChange={(e) => onChange({ ...value, region: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">הכל</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">עיר</Label>
            <Input
              placeholder="עיר..."
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-xs">מחיר מקס׳: ₪{value.priceMax.toLocaleString("he-IL")}</Label>
          </div>
          <Slider
            min={0}
            max={20000}
            step={250}
            value={[value.priceMax]}
            onValueChange={([v]) => onChange({ ...value, priceMax: v })}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">מאומתים בלבד</Label>
            <Switch checked={value.verifiedOnly} onCheckedChange={(v) => onChange({ ...value, verifiedOnly: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">VIP בלבד</Label>
            <Switch checked={value.vipOnly} onCheckedChange={(v) => onChange({ ...value, vipOnly: v })} />
          </div>
        </div>

        {(value.specialties.length > 0 || value.genres.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {value.specialties.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
