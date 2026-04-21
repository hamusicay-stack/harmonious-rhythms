import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Plus, Upload, X, ArrowRight, ArrowLeft, Loader2, User, Building2, Zap, Check, MessageCircle } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CATEGORIES, BRANDS, CITIES, CONDITIONS } from "@/lib/marketplaceData";

export const Route = createFileRoute("/marketplace/new")({
  head: () => ({ meta: [{ title: "פרסם מודעה — המוזיקאי" }] }),
  component: NewListingPage,
});

const MAX_IMAGES = 10;

const schema = z.object({
  title: z.string().trim().min(3, "כותרת קצרה מדי").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().min(1, "בחר קטגוריה"),
  customCategory: z.string().optional(),
  subcategory: z.string().optional(),
  customSubcategory: z.string().optional(),
  brand: z.string().optional(),
  customBrand: z.string().optional(),
  model: z.string().max(80).optional(),
  year: z.string().optional(),
  item_condition: z.string().min(1),
  price: z.coerce.number().min(1, "הזן מחיר").max(1000000),
  city: z.string().optional(),
  customCity: z.string().optional(),
  phone: z.string().trim().min(9).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  has_rhythms: z.boolean().optional(),
  has_samples: z.boolean().optional(),
  video_url: z.string().url().optional().or(z.literal("")),
});

type SellerType = "private" | "business" | null;

function NewListingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=seller type, 1=category, 2=details, 3=media, 4=promote+contact
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<string>("");
  const [sellerType, setSellerType] = useState<SellerType>(null);
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [checkingBusiness, setCheckingBusiness] = useState(true);
  const [businessForm, setBusinessForm] = useState({ business_name: "", contact_name: "", phone: "", email: "" });
  const [registeringBusiness, setRegisteringBusiness] = useState(false);
  const [promoOption, setPromoOption] = useState<"none" | "bump24" | "bump48">("none");
  const [phoneHasWhatsapp, setPhoneHasWhatsapp] = useState(true);
  const [form, setForm] = useState<any>({
    title: "", description: "", category: "", customCategory: "", subcategory: "", customSubcategory: "",
    brand: "", customBrand: "", model: "", year: "", item_condition: "used_good", price: "",
    city: "", customCity: "",
    phone: "", whatsapp: "", has_rhythms: false, has_samples: false, video_url: "",
  });

  useEffect(() => {
    if (user) {
      setCheckingBusiness(true);
      supabase.from("marketplace_business_sellers").select("user_id, business_name, phone, email").eq("user_id", user.id).eq("subscription_status", "active").maybeSingle()
        .then(({ data }) => {
          setHasBusinessAccount(!!data);
          if (data) {
            setBusinessForm({
              business_name: data.business_name ?? "",
              contact_name: "",
              phone: data.phone ?? "",
              email: data.email ?? user.email ?? "",
            });
          } else {
            setBusinessForm((f) => ({ ...f, email: user.email ?? "" }));
          }
          setCheckingBusiness(false);
        });
    }
  }, [user]);

  const cat = CATEGORIES.find((c) => c.value === form.category);
  const isKeyboard = form.category === "keyboards" || form.category === "pianos";

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const registerBusiness = async () => {
    if (!user) return;
    if (!businessForm.business_name.trim()) { toast.error("שם העסק חובה"); return; }
    setRegisteringBusiness(true);
    const { error } = await supabase.from("marketplace_business_sellers").insert({
      user_id: user.id,
      business_name: businessForm.business_name.trim(),
      contact_name: businessForm.contact_name.trim() || null,
      phone: businessForm.phone.trim() || null,
      email: businessForm.email.trim() || user.email,
      subscription_status: "active",
    });
    setRegisteringBusiness(false);
    if (error) { toast.error(error.message); return; }
    setHasBusinessAccount(true);
    toast.success("נרשמת כמוכר עסקי!");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files) return;
    const files = Array.from(e.target.files).slice(0, MAX_IMAGES - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) { toast.error(`${file.name}: מעל 15MB`); continue; }
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error } = await supabase.storage.from("marketplace").upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
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
    if (!user || !sellerType) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "מלא את כל השדות הדרושים");
      return;
    }
    if (images.length === 0) { toast.error("יש להעלות לפחות תמונה אחת"); return; }
    if (form.category === "other" && !form.customCategory?.trim()) { toast.error("נא לציין שם קטגוריה"); return; }
    if (form.brand === "אחר" && !form.customBrand?.trim()) { toast.error("נא לציין שם מותג"); return; }
    if (form.city === "אחר" && !form.customCity?.trim()) { toast.error("נא לציין שם עיר"); return; }
    if (form.subcategory === "אחר" && !form.customSubcategory?.trim()) { toast.error("נא לציין תת-קטגוריה"); return; }

    setSubmitting(true);
    const finalBrand = form.brand === "אחר" ? form.customBrand?.trim() : (form.brand || null);
    const finalCity = form.city === "אחר" ? form.customCity?.trim() : (form.city || null);

    const { data: inserted, error } = await supabase.from("marketplace_listings").insert({
      seller_id: user.id,
      seller_type: sellerType,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      category: form.category,
      custom_category: form.category === "other" ? form.customCategory?.trim() : null,
      subcategory: form.subcategory || null,
      custom_subcategory: form.subcategory === "אחר" ? form.customSubcategory?.trim() : null,
      brand: finalBrand,
      custom_brand: form.brand === "אחר" ? form.customBrand?.trim() : null,
      model: form.model?.trim() || null,
      item_condition: form.item_condition,
      price: Number(form.price),
      city: finalCity,
      phone: form.phone.trim(),
      whatsapp: phoneHasWhatsapp ? form.phone.trim() : (form.whatsapp?.trim() || null),
      images,
      video_url: form.video_url || null,
      specs: { year: form.year || null, has_rhythms: !!form.has_rhythms, has_samples: !!form.has_samples },
      status: "pending",
    }).select("id, status").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const wasAutoApproved = inserted?.status === "approved";
    if (promoOption !== "none") {
      toast.success("המודעה נשלחה! קידום בתשלום יתווסף בקרוב.");
    } else if (wasAutoApproved) {
      toast.success("המודעה פורסמה ונראית עכשיו בלוח! 🎉");
    } else {
      toast.success("המודעה נשלחה לאישור! נעדכן אותך כשתאושר.");
    }
    navigate({ to: "/marketplace" });
  };

  if (authLoading) return <ModulePlaceholder icon={Plus} title="טוען..." subtitle="" />;
  if (!user) return (
    <ModulePlaceholder icon={Plus} title="פרסם מודעה" subtitle="יש להתחבר כדי לפרסם מודעה">
      <div className="max-w-md mx-auto text-center space-y-4 py-8">
        <p className="text-muted-foreground">כדי לפרסם מודעה בלוח יד 2 צריך להתחבר תחילה (חינם, לוקח שניה).</p>
        <Link to="/auth"><Button size="lg">התחבר / הירשם</Button></Link>
      </div>
    </ModulePlaceholder>
  );

  const totalSteps = 5;
  const canProceedFromStep0 = sellerType === "private" || (sellerType === "business" && hasBusinessAccount);

  return (
    <ModulePlaceholder icon={Plus} title="פרסם מודעה" subtitle={`שלב ${step + 1} מתוך ${totalSteps}`}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex gap-2">
          {Array.from({ length: totalSteps }).map((_, s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">סוג המפרסם</h2>
              <p className="text-sm text-muted-foreground">בחר את סוג החשבון שמתאים לך:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSellerType("private")}
                  className={`relative rounded-xl border-2 p-5 text-right transition ${sellerType === "private" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  {sellerType === "private" && <Check className="absolute top-3 left-3 h-5 w-5 text-primary" />}
                  <User className="h-8 w-8 text-primary mb-2" />
                  <div className="font-semibold">מוכר פרטי</div>
                  <div className="text-xs text-muted-foreground mt-1">פרסום חינם. הקפצות בתשלום חד-פעמי.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSellerType("business")}
                  className={`relative rounded-xl border-2 p-5 text-right transition ${sellerType === "business" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  {sellerType === "business" && <Check className="absolute top-3 left-3 h-5 w-5 text-primary" />}
                  <Building2 className="h-8 w-8 text-primary mb-2" />
                  <div className="font-semibold">מוכר עסקי</div>
                  <div className="text-xs text-muted-foreground mt-1">תג "עסקי" על המודעה. דורש רישום קצר.</div>
                </button>
              </div>

              {sellerType === "business" && !checkingBusiness && !hasBusinessAccount && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="text-sm font-semibold">רישום מוכר עסקי</div>
                  <p className="text-xs text-muted-foreground">פרטים אלו יוצגו על המודעות שלך כעסק.</p>
                  <div className="space-y-2">
                    <Label>שם העסק *</Label>
                    <Input value={businessForm.business_name} onChange={(e) => setBusinessForm((f) => ({ ...f, business_name: e.target.value }))} placeholder="למשל: כלי נגינה ירושלים" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>איש קשר</Label>
                      <Input value={businessForm.contact_name} onChange={(e) => setBusinessForm((f) => ({ ...f, contact_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>טלפון</Label>
                      <Input value={businessForm.phone} onChange={(e) => setBusinessForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={registerBusiness} disabled={registeringBusiness} className="w-full">
                    {registeringBusiness && <Loader2 className="h-4 w-4 animate-spin" />}
                    הירשם והמשך
                  </Button>
                </div>
              )}

              {sellerType === "business" && hasBusinessAccount && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  זוהית כמוכר עסקי: <span className="font-semibold">{businessForm.business_name}</span>
                </div>
              )}
            </>
          )}

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
              {form.category === "other" && (
                <div className="space-y-2">
                  <Label>פרט שם הקטגוריה *</Label>
                  <Input value={form.customCategory} onChange={(e) => update("customCategory", e.target.value)} placeholder="לדוגמה: ציוד DJ" />
                </div>
              )}
              {cat && cat.value !== "other" && (
                <div className="space-y-2">
                  <Label>תת-קטגוריה</Label>
                  <Select value={form.subcategory} onValueChange={(v) => update("subcategory", v)}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>{cat.subs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.subcategory === "אחר" && (
                <div className="space-y-2">
                  <Label>פרט תת-קטגוריה *</Label>
                  <Input value={form.customSubcategory} onChange={(e) => update("customSubcategory", e.target.value)} />
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
                  <Label>יצרן</Label>
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
              {form.brand === "אחר" && (
                <div className="space-y-2">
                  <Label>שם היצרן *</Label>
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
                  <Label>תכונות מיוחדות</Label>
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
                  <Label>עיר</Label>
                  <Select value={form.city} onValueChange={(v) => update("city", v)}>
                    <SelectTrigger><SelectValue placeholder="בחר עיר" /></SelectTrigger>
                    <SelectContent className="max-h-60">{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.city === "אחר" && (
                <div className="space-y-2">
                  <Label>שם העיר *</Label>
                  <Input value={form.customCity} onChange={(e) => update("customCity", e.target.value)} />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">תמונות וסרטון</h2>
              <div className="space-y-2">
                <Label>תמונות (עד {MAX_IMAGES}) * — {images.length}/{MAX_IMAGES}</Label>
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
                  {images.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground mt-1">הוסף</span>
                      <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploading} />
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
              <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />קידום ופרטי קשר</h2>

              <div className="space-y-3">
                <Label>שדרג את החשיפה (אופציונלי)</Label>
                <div className="space-y-2">
                  {[
                    { value: "none", title: "פרסום רגיל", desc: "המודעה תופיע ברשימה לפי תאריך פרסום", badge: "חינם" },
                    { value: "bump24", title: "הקפצה ל-24 שעות", desc: "המודעה תופיע בראש הלוח למשך יממה", badge: "בקרוב" },
                    { value: "bump48", title: "הקפצה ל-48 שעות", desc: "המודעה תופיע בראש הלוח ליומיים", badge: "בקרוב" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPromoOption(opt.value as any)}
                      disabled={opt.value !== "none"}
                      className={`w-full relative rounded-lg border-2 p-3 text-right transition ${promoOption === opt.value ? "border-primary bg-primary/5" : "border-border"} ${opt.value !== "none" ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">{opt.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                        </div>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{opt.badge}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                {sellerType === "business" && hasBusinessAccount && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm">
                    ✓ המודעה תפורסם עם תג "עסקי" — {businessForm.business_name}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>טלפון *</Label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="050-1234567" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg bg-muted/50 p-3 border">
                  <input
                    type="checkbox"
                    checked={phoneHasWhatsapp}
                    onChange={(e) => setPhoneHasWhatsapp(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span>למספר זה יש וואטסאפ</span>
                </label>
                {!phoneHasWhatsapp && (
                  <div className="space-y-2">
                    <Label>מספר וואטסאפ (אופציונלי)</Label>
                    <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="050-1234567" />
                    <p className="text-xs text-muted-foreground">אם לא תזין מספר נפרד, כפתור הוואטסאפ לא יוצג למודעה</p>
                  </div>
                )}
                <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                  <p className="font-semibold">לפני שליחה:</p>
                  <p>• המודעה תישלח לאישור מנהל ותפורסם תוך 24 שעות (או מיידית אם הוגדר אישור אוטומטי)</p>
                  <p>• ניתן יהיה להקפיץ את המודעה לראש הלוח דרך עמוד המודעה</p>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-between pt-4">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowRight className="h-4 w-4" />חזרה</Button>
            ) : <Link to="/marketplace"><Button variant="ghost">ביטול</Button></Link>}
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !canProceedFromStep0}
              >
                הבא<ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                שלח לפרסום
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModulePlaceholder>
  );
}
