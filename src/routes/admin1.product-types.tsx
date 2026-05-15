import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin1/product-types")({
  component: ProductTypesPage,
});

type AttrField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "file" | "select";
  required?: boolean;
  options?: string[];
};

type ProductType = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  attribute_schema: AttrField[];
  sort_order: number;
  enabled: boolean;
};

function ProductTypesPage() {
  const [list, setList] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_types" as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setList(((data ?? []) as ProductType[]).map(p => ({ ...p, attribute_schema: Array.isArray(p.attribute_schema) ? p.attribute_schema : [] })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const newDraft = (): ProductType => ({
    id: "", slug: "", name: "", icon: "", description: "",
    attribute_schema: [], sort_order: list.length, enabled: true,
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.slug || !editing.name) { toast.error("נדרש שם וסלאג"); return; }
    setSaving(true);
    const payload = {
      slug: editing.slug, name: editing.name, icon: editing.icon, description: editing.description,
      attribute_schema: editing.attribute_schema, sort_order: editing.sort_order, enabled: editing.enabled,
    };
    const tbl = supabase.from("product_types" as never) as any;
    const q = editing.id ? tbl.update(payload).eq("id", editing.id) : tbl.insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר");
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק סוג מוצר?")) return;
    const { error } = await supabase.from("product_types" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    await load();
  };

  const addField = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      attribute_schema: [...editing.attribute_schema, { key: "", label: "", type: "text" }],
    });
  };
  const updateField = (i: number, patch: Partial<AttrField>) => {
    if (!editing) return;
    const next = editing.attribute_schema.slice();
    next[i] = { ...next[i], ...patch };
    setEditing({ ...editing, attribute_schema: next });
  };
  const removeField = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, attribute_schema: editing.attribute_schema.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>סוגי מוצרים</CardTitle>
          <Button onClick={() => setEditing(newDraft())} size="sm">
            <Plus className="h-4 w-4 ml-1" /> חדש
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead><TableHead>סלאג</TableHead><TableHead>שדות</TableHead>
                  <TableHead>פעיל</TableHead><TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><code className="text-xs">{p.slug}</code></TableCell>
                    <TableCell><Badge variant="secondary">{p.attribute_schema.length}</Badge></TableCell>
                    <TableCell>{p.enabled ? "✓" : "—"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>ערוך</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">אין סוגי מוצרים עדיין</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? "עריכת סוג" : "יצירת סוג חדש"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>שם</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>סלאג</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>אייקון (lucide)</Label><Input value={editing.icon ?? ""} onChange={e => setEditing({ ...editing, icon: e.target.value })} /></div>
              <div><Label>סדר</Label><Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>תיאור</Label><Textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} /><Label>פעיל</Label></div>
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">שדות מטא-נתונים דינמיים</Label>
                <Button size="sm" variant="outline" onClick={addField}><Plus className="h-4 w-4 ml-1" /> שדה</Button>
              </div>
              {editing.attribute_schema.length === 0 && <p className="text-xs text-muted-foreground">לדוגמה: "Requires Info File" (file), "Download Expiry" (number).</p>}
              {editing.attribute_schema.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3"><Label className="text-xs">key</Label><Input value={f.key} onChange={e => updateField(i, { key: e.target.value })} /></div>
                  <div className="col-span-3"><Label className="text-xs">label</Label><Input value={f.label} onChange={e => updateField(i, { label: e.target.value })} /></div>
                  <div className="col-span-3"><Label className="text-xs">type</Label>
                    <Select value={f.type} onValueChange={v => updateField(i, { type: v as AttrField["type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">טקסט</SelectItem>
                        <SelectItem value="number">מספר</SelectItem>
                        <SelectItem value="boolean">כן/לא</SelectItem>
                        <SelectItem value="file">קובץ</SelectItem>
                        <SelectItem value="select">בחירה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={!!f.required} onCheckedChange={v => updateField(i, { required: v })} />
                    <Label className="text-xs">חובה</Label>
                  </div>
                  <div className="col-span-1"><Button size="sm" variant="ghost" onClick={() => removeField(i)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditing(null)}>בטל</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />} שמור
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
