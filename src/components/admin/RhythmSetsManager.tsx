import { useEffect, useRef, useState } from "react";
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
import { Plus, Trash2, Save, Loader2, Music, Piano, Package, AudioLines, Pencil, FolderTree, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import { normalizeAudioUrl } from "@/lib/audioUrl";
import { OrganUIThemeEditor } from "@/components/admin/OrganUIThemeEditor";

type Brand = { id: string; name: string; logo_url: string | null; created_at: string };
type KeyboardModel = { id: string; brand_id: string; model_name: string; ui_image_url: string | null; created_at: string };
type RhythmSet = {
  id: string; brand_id: string; creator_name: string; set_name: string; description: string | null;
  price: number; requires_info_file: boolean; info_file_extension: string | null; is_automated: boolean; created_at: string;
  youtube_video_id?: string | null;
  cover_image_url?: string | null;
  video_source_type?: string | null;
  video_url?: string | null;
};
type AudioSample = { id: string; set_id: string; rhythm_item_id: string | null; button_type: string; audio_url: string; created_at: string };
type RhythmFolder = { id: string; set_id: string; name: string; sort_order: number };
type RhythmItem = { id: string; folder_id: string; name: string; description: string | null; sort_order: number };

export function RhythmSetsManager() {
  const [designOpen, setDesignOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">BEAT — ניהול סטים</h2>
          <p className="text-xs text-muted-foreground">מותגים, דגמים, סטים, תיקיות פריטים ודגימות אודיו.</p>
        </div>
        <Dialog open={designOpen} onOpenChange={setDesignOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Palette className="h-4 w-4" />
              עיצוב מסך אורגן
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>עיצוב מסכי אורגן</DialogTitle></DialogHeader>
            <OrganUIThemeEditor />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="sets" className="w-full">
        <div className="overflow-x-auto touch-pan-x -mx-2 px-2" dir="rtl">
          <TabsList className="inline-flex w-max h-auto gap-1">
            <TabsTrigger value="brands" className="shrink-0"><Music className="ml-1 h-4 w-4" />מותגים</TabsTrigger>
            <TabsTrigger value="models" className="shrink-0"><Piano className="ml-1 h-4 w-4" />דגמי קלידים</TabsTrigger>
            <TabsTrigger value="sets" className="shrink-0"><Package className="ml-1 h-4 w-4" />סטי BEAT</TabsTrigger>
            <TabsTrigger value="folders" className="shrink-0"><FolderTree className="ml-1 h-4 w-4" />תיקיות ופריטים</TabsTrigger>
            <TabsTrigger value="samples" className="shrink-0"><AudioLines className="ml-1 h-4 w-4" />דגימות אודיו</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="brands" className="mt-6"><BrandsSection /></TabsContent>
        <TabsContent value="models" className="mt-6"><ModelsSection /></TabsContent>
        <TabsContent value="sets" className="mt-6"><SetsSection /></TabsContent>
        <TabsContent value="folders" className="mt-6"><FoldersItemsSection /></TabsContent>
        <TabsContent value="samples" className="mt-6"><SamplesSection /></TabsContent>
      </Tabs>
    </div>
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
    if (error) toast.error(error.message); else setRows((data ?? []) as unknown as Brand[]);
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = {
    brand_id: "", creator_name: "", set_name: "", description: "", price: "0",
    requires_info_file: false, info_file_extension: "", is_automated: false,
    youtube_video_id: "",
    video_source_type: "youtube" as "youtube" | "google_drive" | "direct",
    video_url: "",
    cover_image_url: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

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

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: RhythmSet) => {
    setEditingId(s.id);
    setForm({
      brand_id: s.brand_id,
      creator_name: s.creator_name,
      set_name: s.set_name,
      description: s.description ?? "",
      price: String(s.price ?? 0),
      requires_info_file: !!s.requires_info_file,
      info_file_extension: s.info_file_extension ?? "",
      is_automated: !!s.is_automated,
      youtube_video_id: s.youtube_video_id ?? "",
      video_source_type: ((s.video_source_type as any) || "youtube") as "youtube" | "google_drive" | "direct",
      video_url: s.video_url ?? "",
      cover_image_url: s.cover_image_url ?? "",
    });
    setOpen(true);
  };

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("beat-video").upload(path, file, { cacheControl: "3600", upsert: false });
    setUploadingVideo(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("beat-video").getPublicUrl(path);
    setForm((f) => ({ ...f, video_url: data.publicUrl, video_source_type: "direct" }));
    toast.success("הווידאו הועלה");
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("beat-video").upload(path, file, { cacheControl: "3600", upsert: false });
    setUploadingCover(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("beat-video").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    toast.success("תמונת השער הועלתה");
  };

  const save = async () => {
    if (!form.brand_id || !form.creator_name.trim() || !form.set_name.trim()) return toast.error("חסרים שדות חובה");
    setSaving(true);
    const payload = {
      brand_id: form.brand_id,
      creator_name: form.creator_name.trim(),
      set_name: form.set_name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      requires_info_file: form.requires_info_file,
      info_file_extension: form.requires_info_file ? (form.info_file_extension.trim() || null) : null,
      is_automated: form.is_automated,
      youtube_video_id: form.youtube_video_id.trim() || null,
      video_source_type: form.video_source_type,
      video_url: form.video_url.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("rhythm_sets" as any).update(payload as any).eq("id", editingId)
      : await supabase.from("rhythm_sets" as any).insert(payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "עודכן" : "נוסף");
    setForm(emptyForm);
    setEditingId(null);
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
        <CardTitle>סטי BEAT</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="ml-1 h-4 w-4" />סט חדש</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "עריכת" : "הוספת"} סט BEAT</DialogTitle></DialogHeader>
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
              {/* Cover image */}
              <div>
                <Label>תמונת שער</Label>
                <div className="flex gap-2 items-start">
                  {form.cover_image_url && <img src={form.cover_image_url} alt="cover" className="h-16 w-16 rounded object-cover border" />}
                  <div className="flex-1 space-y-1">
                    <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => coverFileRef.current?.click()} disabled={uploadingCover}>
                      {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Upload className="h-3 w-3 ml-1" />}העלאת תמונה
                    </Button>
                    <Input dir="ltr" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="או הזן URL" />
                  </div>
                </div>
              </div>
              {/* Video source — 3 tabs */}
              <div>
                <Label>מקור וידאו לדף המוצר</Label>
                <Tabs value={form.video_source_type} onValueChange={(v) => setForm({ ...form, video_source_type: v as any })} className="mt-1">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="youtube">YouTube</TabsTrigger>
                    <TabsTrigger value="google_drive">Google Drive</TabsTrigger>
                    <TabsTrigger value="direct">העלאה ישירה</TabsTrigger>
                  </TabsList>
                  <TabsContent value="youtube" className="mt-2">
                    <Input dir="ltr" value={form.video_url || form.youtube_video_id} onChange={(e) => setForm({ ...form, video_url: e.target.value, youtube_video_id: e.target.value })} placeholder="https://youtu.be/... או dQw4w9WgXcQ" />
                  </TabsContent>
                  <TabsContent value="google_drive" className="mt-2">
                    <Input dir="ltr" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://drive.google.com/file/d/.../view" />
                    <p className="mt-1 text-xs text-muted-foreground">הדבק קישור שיתוף — המערכת תמיר אוטומטית לתצוגת וידאו.</p>
                  </TabsContent>
                  <TabsContent value="direct" className="mt-2 space-y-2">
                    <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => videoFileRef.current?.click()} disabled={uploadingVideo}>
                      {uploadingVideo ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Upload className="h-3 w-3 ml-1" />}העלאת MP4
                    </Button>
                    <Input dir="ltr" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="URL ישיר לקובץ" />
                  </TabsContent>
                </Tabs>
              </div>
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
            <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
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
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
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
const BUTTON_OPTIONS = [
  "Intro_1", "Intro_2", "Intro_3",
  "Main_A", "Main_B", "Main_C", "Main_D",
  "Fill_AA", "Fill_BB", "Fill_CC", "Fill_DD",
  "Ending_1", "Ending_2", "Ending_3",
];

function SamplesSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [folders, setFolders] = useState<RhythmFolder[]>([]);
  const [items, setItems] = useState<RhythmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [setId, setSetId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [itemId, setItemId] = useState("");
  const [buttonType, setButtonType] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    const path = `samples/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("beat-audio").upload(path, file, { cacheControl: "3600", upsert: false });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("beat-audio").getPublicUrl(path);
    setAudioUrl(data.publicUrl);
    toast.success("קובץ הועלה");
  };

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: s }, { data: f }, { data: i }] = await Promise.all([
      supabase.from("set_audio_samples" as any).select("*, set:rhythm_sets(*), item:rhythm_items(name, folder:rhythm_folders(name, set_id))").order("created_at", { ascending: false }),
      supabase.from("rhythm_sets" as any).select("*").order("set_name"),
      supabase.from("rhythm_folders" as any).select("*").order("sort_order"),
      supabase.from("rhythm_items" as any).select("*").order("sort_order"),
    ]);
    setRows((a ?? []) as any);
    setSets((s ?? []) as unknown as RhythmSet[]);
    setFolders((f ?? []) as unknown as RhythmFolder[]);
    setItems((i ?? []) as unknown as RhythmItem[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filteredFolders = folders.filter((f) => f.set_id === setId);
  const filteredItems = items.filter((it) => it.folder_id === folderId);

  const create = async () => {
    if (!setId || !itemId || !buttonType || !audioUrl.trim()) return toast.error("כל השדות חובה");
    setSaving(true);
    const normalized = normalizeAudioUrl(audioUrl.trim());
    const { error } = await supabase.from("set_audio_samples" as any).insert({
      set_id: setId,
      rhythm_item_id: itemId,
      button_type: buttonType,
      audio_url: normalized,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("נוסף");
    setSetId(""); setFolderId(""); setItemId(""); setButtonType(""); setAudioUrl(""); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק דגימה?")) return;
    const { error } = await supabase.from("set_audio_samples" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); void load();
  };

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
                <Select value={setId} onValueChange={(v) => { setSetId(v); setFolderId(""); setItemId(""); }}>
                  <SelectTrigger><SelectValue placeholder="בחר סט" /></SelectTrigger>
                  <SelectContent>{sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.set_name} — {s.creator_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>תיקייה</Label>
                <Select value={folderId} onValueChange={(v) => { setFolderId(v); setItemId(""); }}>
                  <SelectTrigger><SelectValue placeholder="בחר תיקייה" /></SelectTrigger>
                  <SelectContent>{filteredFolders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>פריט מקצב</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger><SelectValue placeholder="בחר פריט" /></SelectTrigger>
                  <SelectContent>{filteredItems.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג כפתור</Label>
                <Select value={buttonType} onValueChange={setButtonType}>
                  <SelectTrigger><SelectValue placeholder="בחר כפתור" /></SelectTrigger>
                  <SelectContent>{BUTTON_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>אודיו</Label>
                <div className="flex gap-2 mb-1">
                  <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Upload className="h-3 w-3 ml-1" />}
                    העלאת קובץ
                  </Button>
                </div>
                <Input dir="ltr" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://... או קישור Google Drive (יומר אוטומטית)" />
              </div>
            </div>
            <DialogFooter><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />שמור</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>סט</TableHead><TableHead>תיקייה</TableHead><TableHead>פריט</TableHead><TableHead>כפתור</TableHead><TableHead>אודיו</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.set?.set_name ?? "—"}</TableCell>
                  <TableCell>{a.item?.folder?.name ?? "—"}</TableCell>
                  <TableCell>{a.item?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{a.button_type}</Badge></TableCell>
                  <TableCell><audio src={a.audio_url} controls className="h-8 max-w-[200px]" /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">אין דגימות עדיין</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Folders & Items -------------------- */
function FoldersItemsSection() {
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [setId, setSetId] = useState<string>("");
  const [folders, setFolders] = useState<RhythmFolder[]>([]);
  const [items, setItems] = useState<RhythmItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [newItem, setNewItem] = useState<{ folder_id: string; name: string }>({ folder_id: "", name: "" });

  useEffect(() => {
    supabase.from("rhythm_sets" as any).select("*").order("set_name").then(({ data }) => setSets((data ?? []) as any));
  }, []);

  const loadSet = async (id: string) => {
    setSetId(id);
    if (!id) { setFolders([]); setItems([]); return; }
    setLoading(true);
    const { data: f } = await supabase.from("rhythm_folders" as any).select("*").eq("set_id", id).order("sort_order");
    setFolders((f ?? []) as any);
    const folderIds = (f ?? []).map((x: any) => x.id);
    if (folderIds.length) {
      const { data: i } = await supabase.from("rhythm_items" as any).select("*").in("folder_id", folderIds).order("sort_order");
      setItems((i ?? []) as any);
    } else setItems([]);
    setLoading(false);
  };

  const addFolder = async () => {
    if (!setId || !newFolder.trim()) return;
    const { error } = await supabase.from("rhythm_folders" as any).insert({ set_id: setId, name: newFolder.trim(), sort_order: folders.length } as any);
    if (error) return toast.error(error.message);
    setNewFolder(""); loadSet(setId);
  };

  const delFolder = async (id: string) => {
    if (!confirm("למחוק תיקייה? כל הפריטים שלה יימחקו.")) return;
    const { error } = await supabase.from("rhythm_folders" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadSet(setId);
  };

  const addItem = async () => {
    if (!newItem.folder_id || !newItem.name.trim()) return toast.error("בחר תיקייה ומלא שם");
    const folderItems = items.filter((i) => i.folder_id === newItem.folder_id);
    const { error } = await supabase.from("rhythm_items" as any).insert({
      folder_id: newItem.folder_id, name: newItem.name.trim(), sort_order: folderItems.length,
    } as any);
    if (error) return toast.error(error.message);
    setNewItem({ folder_id: newItem.folder_id, name: "" });
    loadSet(setId);
  };

  const delItem = async (id: string) => {
    if (!confirm("למחוק פריט מקצב?")) return;
    const { error } = await supabase.from("rhythm_items" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadSet(setId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>תיקיות ופריטי מקצב</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>בחר סט</Label>
          <Select value={setId} onValueChange={loadSet}>
            <SelectTrigger><SelectValue placeholder="בחר סט" /></SelectTrigger>
            <SelectContent>{sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.set_name} — {s.creator_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {setId && (
          <>
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">תיקיות</h3>
              <div className="mb-3 flex gap-2">
                <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="שם תיקייה (Freilach, Dance...)" />
                <Button onClick={addFolder} size="sm"><Plus className="h-4 w-4" /></Button>
              </div>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="flex flex-wrap gap-2">
                  {folders.map((f) => (
                    <Badge key={f.id} variant="outline" className="gap-1 pr-1">
                      {f.name}
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => delFolder(f.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </Badge>
                  ))}
                  {folders.length === 0 && <span className="text-sm text-muted-foreground">אין תיקיות עדיין.</span>}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">פריטי מקצב</h3>
              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                <Select value={newItem.folder_id} onValueChange={(v) => setNewItem({ ...newItem, folder_id: v })}>
                  <SelectTrigger><SelectValue placeholder="תיקייה" /></SelectTrigger>
                  <SelectContent>{folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="שם המקצב" />
                <Button onClick={addItem} size="sm"><Plus className="h-4 w-4" /></Button>
              </div>

              {folders.map((f) => {
                const its = items.filter((i) => i.folder_id === f.id);
                return (
                  <div key={f.id} className="mb-3">
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">{f.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {its.map((it) => (
                        <Badge key={it.id} variant="secondary" className="gap-1 pr-1">
                          {it.name}
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => delItem(it.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </Badge>
                      ))}
                      {its.length === 0 && <span className="text-xs text-muted-foreground">— ריק —</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
