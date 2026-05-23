import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PACKAGE_UNITS } from "@/lib/prosData";

export type EditablePackage = {
  id?: string;
  title: string;
  description: string;
  price: number;
  unit: string;
};

type Props = {
  value: EditablePackage[];
  onChange: (v: EditablePackage[]) => void;
};

export function PackagesEditor({ value, onChange }: Props) {
  const update = (i: number, patch: Partial<EditablePackage>) => {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...value, { title: "", description: "", price: 0, unit: "event" }]);

  return (
    <div className="space-y-3">
      {value.map((pkg, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">חבילה {i + 1}</Label>
            <Button size="sm" variant="ghost" onClick={() => remove(i)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="כותרת (לדוגמה: נגינה באירוע)"
            value={pkg.title}
            onChange={(e) => update(i, { title: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder="תיאור קצר"
            value={pkg.description}
            onChange={(e) => update(i, { description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="מחיר ₪"
              value={pkg.price || ""}
              onChange={(e) => update(i, { price: Number(e.target.value) || 0 })}
            />
            <Select value={pkg.unit} onValueChange={(v) => update(i, { unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PACKAGE_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="ms-2 h-4 w-4" /> הוסף חבילה
      </Button>
    </div>
  );
}
