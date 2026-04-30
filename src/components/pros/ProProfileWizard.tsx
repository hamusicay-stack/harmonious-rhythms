import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronLeft, Check, Loader2, Save, User2, Tag, MapPin, Image as ImageIcon, Phone, Package, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MediaUploader } from "@/components/pros/MediaUploader";
import { PackagesEditor, type EditablePackage } from "@/components/pros/PackagesEditor";
import { SPECIALTIES, GENRES, REGIONS } from "@/lib/prosData";
import { cn } from "@/lib/utils";

export type ProFormState = {
  display_name: string;
  headline: string;
  bio: string;
  region: string;
  cities: string[];
  specialties: string[];
  genres: string[];
  gear_list: string[];
  brand_color: string;
  hourly_price_min: number | null;
  profile_image: string | null;
  cover_image: string | null;
  whatsapp: string;
  phone: string;
  instagram: string;
  youtube: string;
  website: string;
  show_phone_public?: boolean;
  show_whatsapp_public?: boolean;
  subscription_tier?: string;
};

type StepDef = { id: string; title: string; icon: typeof User2; description: string };

const STEPS: StepDef[] = [
  { id: "basics",    title: "פרטים בסיסיים", icon: User2,      description: "שם, כותרת ותיאור" },
  { id: "expertise", title: "התמחות וסגנון",  icon: Tag,        description: "תחומי עיסוק וסגנונות" },
  { id: "location",  title: "אזור ומחיר",     icon: MapPin,     description: "מיקום, ערים ותעריפים" },
  { id: "media",     title: "מדיה וצבעים",    icon: ImageIcon,  description: "תמונות וצבע מותג" },
  { id: "contact",   title: "יצירת קשר",      icon: Phone,      description: "טלפון ורשתות חברתיות" },
  { id: "packages",  title: "חבילות מחיר",    icon: Package,    description: "מה אתה מציע ובאיזה מחיר" },
  { id: "review",    title: "סקירה ושמירה",   icon: ListChecks, description: "בדיקה אחרונה" },
];

export function ProProfileWizard({
  value,
  onChange,
  packages,
  onPackagesChange,
  onSave,
  saving,
  extraSlot,
}: {
  value: ProFormState;
  onChange: (next: ProFormState) => void;
  packages: EditablePackage[];
  onPackagesChange: (next: EditablePackage[]) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
  extraSlot?: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const update = <K extends keyof ProFormState>(k: K, v: ProFormState[K]) => onChange({ ...value, [k]: v });
  const toggle = (key: "specialties" | "genres", v: string) => {
    const arr = value[key];
    update(key, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const canNext = () => {
    if (step === 0) return value.display_name.trim().length > 1;
    return true;
  };

  return (
    <div className="space-y-6 text-right">
      {/* Stepper */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>שלב {step + 1} מתוך {STEPS.length}</span>
            <span>{STEPS[step].title}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-l from-primary to-primary/60 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && !active && "border-primary/40 bg-primary/10 text-primary",
                    !active && !done && "border-border text-muted-foreground hover:border-primary/60"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step body */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-display text-xl font-bold">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>שם תצוגה *</Label>
                  <Input value={value.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="השם שיוצג ללקוחות" />
                </div>
                <div>
                  <Label>כותרת מקצועית</Label>
                  <Input value={value.headline} onChange={(e) => update("headline", e.target.value)} placeholder="לדוגמה: קלידן לאירועים ואולפן" />
                </div>
              </div>
              <div>
                <Label>על עצמי</Label>
                <Textarea rows={5} value={value.bio} onChange={(e) => update("bio", e.target.value)} placeholder="ספר ללקוחות על הניסיון, הסגנון והשירותים שלך" />
                <p className="mt-1 text-xs text-muted-foreground">{value.bio.length} תווים · מומלץ 200-600</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">התמחות</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map((s) => (
                    <button key={s.value} type="button" onClick={() => toggle("specialties", s.value)}
                      className={cn("rounded-full border px-3 py-1 text-xs", value.specialties.includes(s.value) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">סגנונות</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <button key={g.value} type="button" onClick={() => toggle("genres", g.value)}
                      className={cn("rounded-full border px-3 py-1 text-xs", value.genres.includes(g.value) ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>ציוד (מופרד בפסיקים)</Label>
                <Input value={value.gear_list.join(", ")} onChange={(e) => update("gear_list", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>אזור</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={value.region} onChange={(e) => update("region", e.target.value)}>
                  <option value="">בחר...</option>
                  {REGIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div>
                <Label>ערים (מופרד בפסיקים)</Label>
                <Input value={value.cities.join(", ")} onChange={(e) => update("cities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
              </div>
              <div>
                <Label>מחיר התחלתי לשעה ₪</Label>
                <Input type="number" dir="ltr" value={value.hourly_price_min ?? ""} onChange={(e) => update("hourly_price_min", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>תמונת פרופיל</Label>
                  <MediaUploader folder="profile" accept="image/*" value={value.profile_image} onChange={(url) => update("profile_image", url)} />
                </div>
                <div>
                  <Label>תמונת קאבר</Label>
                  <MediaUploader folder="cover" accept="image/*" value={value.cover_image} onChange={(url) => update("cover_image", url)} />
                </div>
              </div>
              <div>
                <Label>צבע מותג</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={value.brand_color || "#D4A24E"} onChange={(e) => update("brand_color", e.target.value)} className="h-10 w-16 rounded border" />
                  <Input dir="ltr" value={value.brand_color} onChange={(e) => update("brand_color", e.target.value)} className="max-w-[140px]" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>וואטסאפ</Label><Input dir="ltr" value={value.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+9725..." /></div>
                <div><Label>טלפון</Label><Input dir="ltr" value={value.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                <div><Label>Instagram</Label><Input dir="ltr" value={value.instagram} onChange={(e) => update("instagram", e.target.value)} /></div>
                <div><Label>YouTube</Label><Input dir="ltr" value={value.youtube} onChange={(e) => update("youtube", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>אתר</Label><Input dir="ltr" value={value.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" /></div>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold">פרסום מספר טלפון בפרופיל הציבורי</div>
                    <div className="text-xs text-muted-foreground">זמין רק למוזיקאים VIP. אחרת המספר מוסתר ולקוחות יוכלו לפנות בצ'אט בלבד.</div>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary disabled:opacity-50"
                    checked={!!value.show_phone_public}
                    disabled={value.subscription_tier !== "vip"}
                    onChange={(e) => update("show_phone_public" as keyof ProFormState, e.target.checked as never)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold">פרסום וואטסאפ בפרופיל הציבורי</div>
                    <div className="text-xs text-muted-foreground">זמין רק למוזיקאים VIP.</div>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary disabled:opacity-50"
                    checked={!!value.show_whatsapp_public}
                    disabled={value.subscription_tier !== "vip"}
                    onChange={(e) => update("show_whatsapp_public" as keyof ProFormState, e.target.checked as never)}
                  />
                </div>
                {value.subscription_tier !== "vip" && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">
                    שדרג ל-VIP כדי לאפשר פרסום אנשי קשר ישירות בפרופיל. כברירת מחדל, פניות יגיעו דרך טופס בקשת הצעת מחיר וצ'אט.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">הוסף חבילות עם תיאור ומחיר. לקוחות יראו זאת בפרופיל שלך.</p>
              <PackagesEditor value={packages} onChange={onPackagesChange} />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 p-4">
                <h3 className="mb-3 font-display text-lg font-bold">סיכום הפרופיל</h3>
                <ReviewRow label="שם תצוגה" value={value.display_name || "—"} />
                <ReviewRow label="כותרת" value={value.headline || "—"} />
                <ReviewRow label="תיאור" value={value.bio ? `${value.bio.length} תווים` : "חסר"} />
                <ReviewRow label="התמחויות" value={value.specialties.length ? `${value.specialties.length} פריטים` : "לא נבחרו"} />
                <ReviewRow label="סגנונות" value={value.genres.length ? `${value.genres.length} פריטים` : "לא נבחרו"} />
                <ReviewRow label="אזור" value={value.region || "—"} />
                <ReviewRow label="מחיר התחלתי" value={value.hourly_price_min ? `₪${value.hourly_price_min}` : "—"} />
                <ReviewRow label="תמונת פרופיל" value={value.profile_image ? "✓ הועלתה" : "חסר"} />
                <ReviewRow label="חבילות" value={`${packages.filter((p) => p.title.trim()).length} חבילות`} />
                <ReviewRow label="ערוצי קשר" value={[value.whatsapp, value.phone, value.instagram, value.youtube, value.website].filter(Boolean).length + " מולאו"} />
              </div>
              {extraSlot}
              <Button onClick={onSave} disabled={saving} size="lg" className="w-full">
                {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                שמור את הפרופיל
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronRight className="ml-1 h-4 w-4" />
          הקודם
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext()}>
            הבא
            <ChevronLeft className="mr-1 h-4 w-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">סיום השלב האחרון</span>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
