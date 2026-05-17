import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Save, Trash2, Pencil, Eye, MousePointerClick, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  position: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  views_count: number;
  clicks_count: number;
  bypass_vip: boolean;
};

const VIP_BYPASS_DEFAULT_POSITIONS = new Set([
  "sidebar_left",
  "sidebar_right",
  "global_top",
  "global_bottom",
]);

const POSITIONS = [
  { value: "global_top", label: "ראש כל הדפים (גלובלי)" },
  { value: "global_bottom", label: "תחתית כל הדפים (גלובלי)" },
  { value: "home_top", label: "ראש עמוד הבית" },
  { value: "home_middle", label: "אמצע עמוד הבית" },
  { value: "home_bottom", label: "תחתית עמוד הבית" },
  { value: "sidebar_right", label: "סרגל צד ימין" },
  { value: "sidebar_left", label: "סרגל צד שמאל" },
  { value: "forum_top", label: "ראש הפורום" },
  { value: "forum_bottom", label: "תחתית הפורום" },
  { value: "store_top", label: "ראש החנות" },
  { value: "store_bottom", label: "תחתית החנות" },
  { value: "academy_top", label: "ראש האקדמיה" },
  { value: "academy_bottom", label: "תחתית האקדמיה" },
  { value: "marketplace_top", label: "ראש המרקטפלייס" },
  { value: "marketplace_bottom", label: "תחתית המרקטפלייס" },
  { value: "about_top", label: "ראש דף אודות" },
  { value: "contact_top", label: "ראש דף יצירת קשר" },
  { value: "shorts_left", label: "שורטס — עמודה שמאלית" },
  { value: "shorts_right_top", label: "שורטס — ימין עליון" },
  { value: "shorts_right_bottom", label: "שורטס — ימין תחתון" },
  { value: "shorts_in_feed", label: "שורטס — בתוך הפיד (interstitial)" },
];

const positionLabel = (v: string) => POSITIONS.find((p) => p.value === v)?.label ?? v;

export function BannersManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ad_banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת הבאנרים");
    setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הבאנר?")) return;
    const { error } = await supabase.from("ad_banners").delete().eq("id", id);
    if (error) return toast.error("שגיאה במחיקה");
    toast.success("הבאנר נמחק");
    load();
  };

  const isLive = (b: Banner) => {
    const now = Date.now();
    const startsOk = new Date(b.starts_at).getTime() <= now;
    const endsOk = !b.ends_at || new Date(b.ends_at).getTime() > now;
    return b.is_active && startsOk && endsOk;
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>ניהול פרסומות ({banners.length})</CardTitle>
        <BannerEditDialog onSaved={load} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תצוגה</TableHead>
                  <TableHead>כותרת</TableHead>
                  <TableHead>מיקום</TableHead>
                  <TableHead>תוקף</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead><Eye className="inline h-4 w-4" /> צפיות</TableHead>
                  <TableHead><MousePointerClick className="inline h-4 w-4" /> קליקים</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((b) => {
                  const ctr = b.views_count > 0 ? ((b.clicks_count / b.views_count) * 100).toFixed(1) : "0";
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <img src={b.image_url} alt={b.title} className="h-10 w-20 rounded object-cover" />
                      </TableCell>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell><Badge variant="outline">{positionLabel(b.position)}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {b.ends_at ? new Date(b.ends_at).toLocaleDateString("he-IL") : "ללא הגבלה"}
                      </TableCell>
                      <TableCell>
                        {isLive(b) ? <Badge>פעיל</Badge> : <Badge variant="secondary">לא פעיל</Badge>}
                      </TableCell>
                      <TableCell>{b.views_count}</TableCell>
                      <TableCell>{b.clicks_count} <span className="text-xs text-muted-foreground">({ctr}%)</span></TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <BannerEditDialog banner={b} onSaved={load} />
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {banners.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">אין פרסומות עדיין</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BannerEditDialog({ banner, onSaved }: { banner?: Banner; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    title: banner?.title ?? "",
    image_url: banner?.image_url ?? "",
    target_url: banner?.target_url ?? "",
    position: banner?.position ?? "home_top",
    is_active: banner?.is_active ?? true,
    starts_at: toLocalInput(banner?.starts_at) || toLocalInput(new Date().toISOString()),
    ends_at: toLocalInput(banner?.ends_at),
    bypass_vip:
      banner?.bypass_vip ??
      VIP_BYPASS_DEFAULT_POSITIONS.has(banner?.position ?? "home_top"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error("שגיאה בהעלאה: " + upErr.message);
    }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("התמונה הועלתה");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url || !form.target_url.trim()) {
      return toast.error("כותרת, תמונה וקישור יעד הם שדות חובה");
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      image_url: form.image_url,
      target_url: form.target_url.trim(),
      position: form.position,
      is_active: form.is_active,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    const { error } = banner
      ? await supabase.from("ad_banners").update(payload).eq("id", banner.id)
      : await supabase.from("ad_banners").insert(payload);
    setSaving(false);
    if (error) return toast.error("שגיאה בשמירה: " + error.message);
    toast.success(banner ? "הבאנר עודכן" : "הבאנר נוסף");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {banner ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="ml-2 h-4 w-4" />באנר חדש</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>{banner ? "עריכת באנר" : "באנר חדש"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pl-1">
          <div>
            <Label>כותרת *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>תמונת באנר *</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ImagePlus className="ml-2 h-4 w-4" />}
                העלאת תמונה
              </Button>
              {form.image_url && <img src={form.image_url} alt="" className="h-10 w-20 rounded object-cover" />}
            </div>
          </div>
          <div>
            <Label>קישור יעד *</Label>
            <Input type="url" placeholder="https://..." value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} />
          </div>
          <div>
            <Label>מיקום באתר</Label>
            <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>תאריך התחלה</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <Label>תאריך סיום</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>פעיל</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            שמירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
