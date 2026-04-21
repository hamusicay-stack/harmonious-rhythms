import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Plus, Upload, X, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/new")({
  head: () => ({ meta: [{ title: "פרסם מודעה — המוזיקאי" }] }),
  component: NewListingPage,
});

const CATEGORIES = [
  { value: "keyboards", label: "אורגנים ומקלדות", subs: ["אורגן", "פסנתר חשמלי", "סינתיסייזר", "MIDI Controller", "אחר"] },
  { value: "amplification", label: "ציוד הגברה", subs: ["מגבר", "רמקולים", "מיקסר", "מיקרופון", "אחר"] },
  { value: "wind", label: "כלי נשיפה", subs: ["סקסופון", "חצוצרה", "קלרינט", "חליל", "אחר"] },
  { value: "studio", label: "אולפן ביתי", subs: ["כרטיס קול", "אזניות אולפן", "מוניטורים", "פרוססורים", "אחר"] },
];
const BRANDS = ["Korg", "Yamaha", "Roland", "Casio", "Nord", "Kurzweil", "Behringer", "Shure", "Other"];
const CONDITIONS = [
  { value: "new_sealed", label: "חדש באריזה" },
  { value: "like_new", label: "משומש כחדש" },
  { value: "used_good", label: "תקין" },
  { value: "for_parts", label: "לחלקים" },
];
const REGIONS = ["צפון", "חיפה והקריות", "שרון", "מרכז", "תל אביב", "ירושלים", "שפלה", "דרום", "אילת"];

const schema = z.object({
  title: z.string().trim().min(3, "כותרת קצרה מדי").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().min(1, "בחר קטגוריה"),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  customBrand: z.string().optional(),
  model: z.string().max(80).optional(),
  year: z.string().optional(),
  item_condition: z.string().min(1),
  price: z.coerce.number().min(1, "הזן מחיר").max(1000000),
  region: z.string().optional(),
  phone: z.string().trim().min(9).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  has_rhythms: z.boolean().optional(),
  has_samples: z.boolean().optional(),
  video_url: z.string().url().optional().or(z.literal("")),
});

function NewListingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<string>("");
  const [form, setForm] = useState<any>({
    title: "", description: "", category: "", subcategory: "", brand: "", customBrand: "",
    model: "", year: "", item_condition: "used_good", price: "", region: "",
    phone: "", whatsapp: "", has_rhythms: false, has_samples: false, video_url: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("יש להתחבר כדי לפרסם מודעה");
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, navigate]);

  const cat = CATEGORIES.find((c) => c.value === form.category);
  const isKeyboard = form.category === "keyboards";

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 5 - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: מעל 5MB`); continue; }
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error } = await supabase.storage.from("marketplace").upload(path, file);
        if (error) { toast.error(error.message); continue; }
        const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...urls]);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 50 * 1024 * 1024) { toast.error("וידאו מעל 50MB"); return; }
    setUploading(true);
    try {
      const path = `${user.id}/video-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("marketplace").upload(path, file);
      if (error) { toast.error(error.message); return; }
      const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
      setVideoFile(data.publicUrl);
      update("video_url", data.publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "video/webm" });
        if (!user) return;
        setUploading(true);
        const path = `${user.id}/rec-${Date.now()}.webm`;
        const { error } = await supabase.storage.from("marketplace").upload(path, blob);
        setUploading(false);
        if (error) { toast.error(error.message); return; }
        const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
        setVideoFile(data.publicUrl);
        update("video_url", data.publicUrl);
        toast.success("ההקלטה נשמרה");
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      toast.error("לא ניתן לגשת למצלמה");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "מלא את כל השדות הדרושים");
      return;
    }
    if (images.length === 0) { toast.error("יש להעלות לפחות תמונה אחת"); return; }

    setSubmitting(true);
    const finalBrand = form.brand === "Other" ? form.customBrand?.trim() || "אחר" : form.brand || null;

    const { error } = await supabase.from("marketplace_listings").insert({
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      category: form.category,
      subcategory: form.subcategory || null,
      brand: finalBrand,
      model: form.model?.trim() || null,
      item_condition: form.item_condition,
      price: Number(form.price),
      region: form.region || null,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp?.trim() || form.phone.trim(),
      images,
      video_url: form.video_url || null,
      specs: { year: form.year || null, has_rhythms: !!form.has_rhythms, has_samples: !!form.has_samples },
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("המודעה נשלחה לאישור! נעדכן אותך כשתאושר.");
    navigate({ to: "/marketplace" });
  };

  if (authLoading || !user) return null;

  return (
    <ModulePlaceholder icon={Plus} title="פרסם מודעה" subtitle={`שלב ${step} מתוך 4`}>
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">קטגוריה</h2>
              <div className="space-y-2">
                <Label>סוג כלי</Label>
                <Select value={form.category} onValueChange={(v) => { update("category", v); update("subcategory", ""); }}>
                  <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {cat && (
                <div className="space-y-2">
                  <Label>תת-קטגוריה</Label>
                  <Select value={form.subcategory} onValueChange={(v) => update("subcategory", v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>{cat.subs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>כותרת המודעה *</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="למשל: Korg Pa1000 כחדש" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">פרטים טכניים</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>מותג</Label>
                  <Select value={form.brand} onValueChange={(v) => update("brand", v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>דגם</Label>
                  <Input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="למשל: Pa1000" />
                </div>
              </div>
              {form.brand === "Other" && (
                <div className="space-y-2">
                  <Label>שם המותג</Label>
                  <Input value={form.customBrand} onChange={(e) => update("customBrand", e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>שנת ייצור</Label>
                  <Input value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="2020" />
                </div>
                <div className="space-y-2">
                  <Label>מצב</Label>
                  <Select value={form.item_condition} onValueChange={(v) => update("item_condition", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {isKeyboard && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                  <Label>תכונות מיוחדות (אורגנים)</Label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.has_rhythms} onChange={(e) => update("has_rhythms", e.target.checked)} />
                    סט מקצבים מובנה
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.has_samples} onChange={(e) => update("has_samples", e.target.checked)} />
                    דגימות מותאמות
                  </label>
                </div>
              )}
              <div className="space-y-2">
                <Label>תיאור מפורט</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="תאר את הכלי, מצבו, מה כלול..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>מחיר (₪) *</Label>
                  <Input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>אזור</Label>
                  <Select value={form.region} onValueChange={(v) => update("region", v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">תמונות וסרטון</h2>
              <div className="space-y-2">
                <Label>תמונות (עד 5) *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1 left-1 bg-background/90 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground mt-1">הוסף</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label>סרטון של הכלי מנגן (אופציונלי)</Label>
                {videoFile && <video src={videoFile} controls className="w-full rounded-lg max-h-48" />}
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild><span><Upload className="h-4 w-4" />העלה קובץ</span></Button>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                  </label>
                  {!recording ? (
                    <Button type="button" variant="outline" size="sm" onClick={startRecording}>הקלט עכשיו</Button>
                  ) : (
                    <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>עצור הקלטה</Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">או הדבק קישור YouTube/Instagram</Label>
                  <Input value={form.video_url} onChange={(e) => update("video_url", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-lg font-semibold">פרטי קשר</h2>
              <div className="space-y-2">
                <Label>טלפון *</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="050-1234567" />
              </div>
              <div className="space-y-2">
                <Label>וואטסאפ (אם שונה)</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="50-1234567" />
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <p className="font-semibold">לפני שליחה:</p>
                <p>• המודעה תישלח לאישור מנהל ותפורסם תוך 24 שעות</p>
                <p>• ודא שכל הפרטים נכונים — תוכל לערוך אחר כך</p>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowRight className="h-4 w-4" />חזרה</Button>
            ) : <Link to="/marketplace"><Button variant="ghost">ביטול</Button></Link>}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>הבא<ArrowLeft className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                שלח לאישור
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModulePlaceholder>
  );
}
