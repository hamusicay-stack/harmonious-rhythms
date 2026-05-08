import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Loader2, Music, Piano, Package, AudioLines } from "lucide-react";
import { toast } from "sonner";

type Brand = { id: string; name: string; logo_url: string | null; created_at: string };
type KeyboardModel = { id: string; brand_id: string; model_name: string; ui_image_url: string | null; created_at: string };
type RhythmSet = {
  id: string; brand_id: string; creator_name: string; set_name: string; description: string | null;
  price: number; requires_info_file: boolean; info_file_extension: string | null; is_automated: boolean; created_at: string;
};
type AudioSample = { id: string; set_id: string; button_type: string; audio_url: string; created_at: string };

export function RhythmSetsManager() {
  return (
    <Tabs defaultValue="brands" className="w-full">
      <TabsList className="flex w-full h-auto gap-1 overflow-x-auto md:grid md:grid-cols-4">
        <TabsTrigger value="brands" className="shrink-0 md:flex-1"><Music className="ml-1 h-4 w-4" />מותגים</TabsTrigger>
        <TabsTrigger value="models" className="shrink-0 md:flex-1"><Piano className="ml-1 h-4 w-4" />דגמי קלידים</TabsTrigger>
        <TabsTrigger value="sets" className="shrink-0 md:flex-1"><Package className="ml-1 h-4 w-4" />סטים (Rhythm Sets)</TabsTrigger>
        <TabsTrigger value="samples" className="shrink-0 md:flex-1"><AudioLines className="ml-1 h-4 w-4" />דגימות אודיו</TabsTrigger>
      </TabsList>
      <TabsContent value="brands" className="mt-6"><BrandsSection /></TabsContent>
      <TabsContent value="models" className="mt-6"><ModelsSection /></TabsContent>
      <TabsContent value="sets" className="mt-6"><SetsSection /></TabsContent>
      <TabsContent value="samples" className="mt-6"><SamplesSection /></TabsContent>
    </Tabs>
  );
}

/* -------------------- Brands -------------------- */
function BrandsSection() {
  const [rows, setRows] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("brands" as any).select("*").order("name");
    if (error) toast.error(error.message); else setRows((data ?? []) as Brand[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!name.trim()) return toast.error("שם מותג חובה");
    setSaving(true);
    const { error } = await supabase.from("brands" as any).insert({ name: name.trim(), logo_url: logo.trim() || null } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("נוסף"); setName(""); setLogo(""); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק מותג? פעולה זו תמחק גם דגמים וסטים תלויים.")) return;
    const { error } = await supabase.from("brands" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>מותגים</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="ml-1 h-4 w-4" />מותג חדש</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת מותג</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>שם מותג</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yamaha / Korg / Medeli" /></div>
              <div><Label>Logo URL</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>שם</TableHead><TableHead>לוגו</TableHead><TableHead>נוצר</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-8" /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">אין מותגים עדיין</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Keyboard Models -------------------- */
function ModelsSection() {
  const [rows, setRows] = useState<(KeyboardModel & { brand?: Brand })[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [modelName, setModelName] = useState("");
  const [img, setImg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: m, error: e1 }, { data: b, error: e2 }] = await Promise.all([
      supabase.from("keyboard_models" as any).select("*, brand:brands(*)").order("model_name"),
      supabase.from("brands" as any).select("*").order("name"),
    ]);
    if (e1) toast.error(e1.message); else setRows((m ?? []) as any);
    if (e2) toast.error(e2.message); else setBrands((b ?? []) as unknown as Brand[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!brandId || !modelName.trim()) return toast.error("מותג ושם דגם נדרשים");
    setSaving(true);
    const { error } = await supabase.from("keyboard_models" as any).insert({ brand_id: brandId, model_name: modelName.trim(), ui_image_url: img.trim() || null } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("נוסף"); setBrandId(""); setModelName(""); setImg(""); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק דגם?")) return;
    const { error } = await supabase.from("keyboard_models" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>דגמי קלידים</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="ml-1 h-4 w-4" />דגם חדש</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת דגם</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>מותג</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger><SelectValue placeholder="בחר מותג" /></SelectTrigger>
                  <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>שם דגם</Label><Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Genos / Tyros 5 / Pa4X" /></div>
              <div><Label>UI Image URL</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>דגם</TableHead><TableHead>מותג</TableHead><TableHead>תמונה</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.model_name}</TableCell>
                  <TableCell>{m.brand?.name ?? "—"}</TableCell>
                  <TableCell>{m.ui_image_url ? <img src={m.ui_image_url} alt={m.model_name} className="h-10" /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">אין דגמים עדיין</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Rhythm Sets -------------------- */
function SetsSection() {
  const [rows, setRows] = useState<(RhythmSet & { brand?: Brand })[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    brand_id: "", creator_name: "", set_name: "", description: "", price: "0",
    requires_info_file: false, info_file_extension: "", is_automated: false,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s, error: e1 }, { data: b, error: e2 }] = await Promise.all([
      supabase.from("rhythm_sets" as any).select("*, brand:brands(*)").order("created_at", { ascending: false }),
      supabase.from("brands" as any).select("*").order("name"),
    ]);
    if (e1) toast.error(e1.message); else setRows((s ?? []) as any);
    if (e2) toast.error(e2.message); else setBrands((b ?? []) as unknown as Brand[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.brand_id || !form.creator_name.trim() || !form.set_name.trim()) return toast.error("חסרים שדות חובה");
    setSaving(true);
    const { error } = await supabase.from("rhythm_sets" as any).insert({
      brand_id: form.brand_id,
      creator_name: form.creator_name.trim(),
      set_name: form.set_name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      requires_info_file: form.requires_info_file,
      info_file_extension: form.requires_info_file ? (form.info_file_extension.trim() || null) : null,
      is_automated: form.is_automated,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("נוסף");
    setForm({ brand_id: "", creator_name: "", set_name: "", description: "", price: "0", requires_info_file: false, info_file_extension: "", is_automated: false });
    setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק סט? כל הדגימות יימחקו.")) return;
    const { error } = await supabase.from("rhythm_sets" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rhythm Sets</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="ml-1 h-4 w-4" />סט חדש</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>הוספת Rhythm Set</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>מותג</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר מותג" /></SelectTrigger>
                  <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>שם יוצר</Label><Input value={form.creator_name} onChange={(e) => setForm({ ...form, creator_name: e.target.value })} placeholder="יוסי תחבר" /></div>
              <div><Label>שם הסט</Label><Input value={form.set_name} onChange={(e) => setForm({ ...form, set_name: e.target.value })} /></div>
              <div><Label>תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>מחיר (₪)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div className="flex items-center justify-between">
                <Label>נדרש קובץ זיהוי?</Label>
                <Switch checked={form.requires_info_file} onCheckedChange={(v) => setForm({ ...form, requires_info_file: v })} />
              </div>
              {form.requires_info_file && (
                <div><Label>סיומת קובץ</Label><Input value={form.info_file_extension} onChange={(e) => setForm({ ...form, info_file_extension: e.target.value })} placeholder=".n27" /></div>
              )}
              <div className="flex items-center justify-between">
                <Label>אוטומציה (Python RPA Webhook)</Label>
                <Switch checked={form.is_automated} onCheckedChange={(v) => setForm({ ...form, is_automated: v })} />
              </div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>שם הסט</TableHead><TableHead>יוצר</TableHead><TableHead>מותג</TableHead>
              <TableHead>מחיר</TableHead><TableHead>קובץ זיהוי</TableHead><TableHead>אוטומטי</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.set_name}</TableCell>
                  <TableCell>{s.creator_name}</TableCell>
                  <TableCell>{s.brand?.name ?? "—"}</TableCell>
                  <TableCell>₪{Number(s.price).toFixed(2)}</TableCell>
                  <TableCell>{s.requires_info_file ? <Badge>{s.info_file_extension || "כן"}</Badge> : <span className="text-muted-foreground text-xs">לא</span>}</TableCell>
                  <TableCell>{s.is_automated ? <Badge variant="secondary">RPA</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">אין סטים עדיין</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Audio Samples -------------------- */
function SamplesSection() {
  const [rows, setRows] = useState<(AudioSample & { set?: RhythmSet })[]>([]);
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [setId, setSetId] = useState("");
  const [buttonType, setButtonType] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: a, error: e1 }, { data: s, error: e2 }] = await Promise.all([
      supabase.from("set_audio_samples" as any).select("*, set:rhythm_sets(*)").order("created_at", { ascending: false }),
      supabase.from("rhythm_sets" as any).select("*").order("set_name"),
    ]);
    if (e1) toast.error(e1.message); else setRows((a ?? []) as any);
    if (e2) toast.error(e2.message); else setSets((s ?? []) as unknown as RhythmSet[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!setId || !buttonType.trim() || !audioUrl.trim()) return toast.error("כל השדות חובה");
    setSaving(true);
    const { error } = await supabase.from("set_audio_samples" as any).insert({ set_id: setId, button_type: buttonType.trim(), audio_url: audioUrl.trim() } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("נוסף"); setSetId(""); setButtonType(""); setAudioUrl(""); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק דגימה?")) return;
    const { error } = await supabase.from("set_audio_samples" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); void load();
  };

  const buttonOptions = ["Intro_1", "Intro_2", "Intro_3", "Main_A", "Main_B", "Main_C", "Main_D", "Fill_AB", "Fill_BA", "Ending_1", "Ending_2", "Ending_3"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>דגימות אודיו לכפתורים</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="ml-1 h-4 w-4" />דגימה חדשה</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת דגימת אודיו</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>סט</Label>
                <Select value={setId} onValueChange={setSetId}>
                  <SelectTrigger><SelectValue placeholder="בחר סט" /></SelectTrigger>
                  <SelectContent>{sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.set_name} — {s.creator_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג כפתור</Label>
                <Select value={buttonType} onValueChange={setButtonType}>
                  <SelectTrigger><SelectValue placeholder="בחר כפתור" /></SelectTrigger>
                  <SelectContent>{buttonOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Audio URL</Label><Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>סט</TableHead><TableHead>כפתור</TableHead><TableHead>אודיו</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.set?.set_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{a.button_type}</Badge></TableCell>
                  <TableCell><audio src={a.audio_url} controls className="h-8 max-w-[200px]" /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">אין דגימות עדיין</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
