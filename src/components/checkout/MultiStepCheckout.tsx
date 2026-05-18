import { friendlyError } from "@/lib/errors";
import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle2, Lock, ShieldCheck, Smartphone, Truck, FileUp, AlertTriangle,
  CreditCard, Loader2, ArrowRight, ArrowLeft, FileCheck2, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

export type CheckoutProduct = {
  product_type: "physical" | "digital_rhythm";
  /** Allowed extensions for digital_rhythm. Defaults to [".info", ".n27"]. */
  allowed_extensions?: string[];
};

type Props = {
  product: CheckoutProduct;
  items: CheckoutItem[];
  onComplete?: (payload: {
    shipping?: ShippingAddress;
    file?: File;
    items: CheckoutItem[];
    total: number;
  }) => void;
};

type ShippingAddress = {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  postal_code: string;
};

const STEPS = [
  { key: "auth", label: "התחברות", icon: Lock },
  { key: "details", label: "פרטי הזמנה", icon: Truck },
  { key: "summary", label: "סיכום ותקנון", icon: FileCheck2 },
  { key: "payment", label: "תשלום", icon: CreditCard },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export function MultiStepCheckout({ product, items, onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<StepKey>(user ? "details" : "auth");
  const [shipping, setShipping] = useState<ShippingAddress>({
    full_name: "", phone: "", street: "", city: "", postal_code: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);

  const allowed = product.allowed_extensions ?? [".info", ".n27"];
  const total = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.quantity, 0), [items]);
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const canProceed = (): boolean => {
    if (step === "auth") return !!user;
    if (step === "details") {
      if (product.product_type === "physical") {
        return Object.values(shipping).every((v) => v.trim().length > 0);
      }
      return !!file;
    }
    if (step === "summary") return agreed;
    return true;
  };

  const next = () => {
    const i = STEPS.findIndex((s) => s.key === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].key);
  };
  const prev = () => {
    const i = STEPS.findIndex((s) => s.key === step);
    if (i > 0) setStep(STEPS[i - 1].key);
  };

  const handlePay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1800));
    setPaying(false);
    toast.success("התשלום בוצע בהצלחה!");
    onComplete?.({
      shipping: product.product_type === "physical" ? shipping : undefined,
      file: file ?? undefined,
      items,
      total,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6" dir="rtl">
      <Stepper currentIndex={stepIdx} />

      <Card className="border-border/60">
        <CardContent className="p-6">
          {step === "auth" && <AuthStep />}
          {step === "details" && (
            product.product_type === "physical"
              ? <ShippingStep value={shipping} onChange={setShipping} />
              : <FileUploadStep allowed={allowed} file={file} setFile={setFile} />
          )}
          {step === "summary" && (
            <SummaryStep items={items} total={total} agreed={agreed} setAgreed={setAgreed} />
          )}
          {step === "payment" && <PaymentStep total={total} paying={paying} onPay={handlePay} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={prev} disabled={stepIdx === 0 || paying}>
          <ArrowRight className="ml-1 h-4 w-4" /> חזרה
        </Button>
        {step !== "payment" ? (
          <Button onClick={next} disabled={!canProceed()}>
            הבא <ArrowLeft className="mr-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------- Stepper -------------------- */
function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = i === currentIndex;
        const done = i < currentIndex;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all",
                done && "bg-primary border-primary text-primary-foreground",
                active && "border-primary text-primary ring-4 ring-primary/15",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={cn("hidden sm:inline text-xs", active ? "text-foreground font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------- Step 1: Auth -------------------- */
function AuthStep() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <ShieldCheck className="h-6 w-6 text-emerald-500" />
        <div>
          <div className="font-medium">מחובר/ת בהצלחה</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!email || !password) return toast.error("מלא/י אימייל וסיסמה");
    setBusy(true);
    const fn = mode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    const { error } = await fn;
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(mode === "login" ? "התחברת!" : "נשלח אימייל אימות");
  };

  const sendOtp = () => {
    if (!phone || phone.length < 9) return toast.error("הזן/י מספר טלפון תקין");
    setOtpSent(true);
    toast.info("קוד אימות נשלח לטלפון (דמו)");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">התחברות לרכישה</h3>
        <p className="text-sm text-muted-foreground">צריך להיות מחובר/ת כדי להמשיך לתשלום.</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">התחברות</TabsTrigger>
          <TabsTrigger value="register">הרשמה</TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="mt-4 space-y-3">
          <div>
            <Label>אימייל</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label>סיסמה</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "login" ? "התחבר/י" : "הירשם/י")}
          </Button>
        </TabsContent>
      </Tabs>

      {/* 2FA placeholder */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">אימות דו-שלבי (SMS OTP)</span>
          <Badge variant="secondary" className="text-[10px]">דמו</Badge>
        </div>
        <div className="flex gap-2">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" disabled={otpSent} />
          <Button variant="outline" onClick={sendOtp} disabled={otpSent}>שלח קוד</Button>
        </div>
        {otpSent && (
          <div className="flex gap-2">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="הזן קוד בן 6 ספרות" maxLength={6} />
            <Button variant="outline" onClick={() => toast.success("אומת")}>אמת</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Step 2a: Shipping -------------------- */
function ShippingStep({ value, onChange }: { value: ShippingAddress; onChange: (v: ShippingAddress) => void }) {
  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">פרטי משלוח</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>שם מלא</Label><Input value={value.full_name} onChange={set("full_name")} /></div>
        <div><Label>טלפון</Label><Input type="tel" value={value.phone} onChange={set("phone")} /></div>
        <div><Label>עיר</Label><Input value={value.city} onChange={set("city")} /></div>
        <div className="sm:col-span-2"><Label>רחוב ומספר</Label><Input value={value.street} onChange={set("street")} /></div>
        <div><Label>מיקוד</Label><Input value={value.postal_code} onChange={set("postal_code")} /></div>
      </div>
    </div>
  );
}

/* -------------------- Step 2b: File Upload -------------------- */
function FileUploadStep({
  allowed, file, setFile,
}: { allowed: string[]; file: File | null; setFile: (f: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validating, setValidating] = useState(false);

  const validate = useCallback((f: File) => {
    const lower = f.name.toLowerCase();
    return allowed.some((ext) => lower.endsWith(ext.toLowerCase()));
  }, [allowed]);

  const handleFile = useCallback((f: File) => {
    if (!validate(f)) {
      toast.error(`קובץ לא נתמך. רק ${allowed.join(", ")} מותרים.`);
      return;
    }
    setValidating(true);
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setValidating(false);
          setFile(f);
          toast.success("הקובץ אומת בהצלחה");
          return 100;
        }
        return p + 10;
      });
    }, 80);
  }, [allowed, setFile, validate]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">העלאת קובץ זיהוי</h3>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <div className="font-medium text-amber-900 dark:text-amber-200">מותר להעלות אך ורק קבצי {allowed.join(" / ")}</div>
          <div className="text-amber-800/80 dark:text-amber-200/80">קבצים אחרים יידחו אוטומטית.</div>
        </div>
      </div>

      {!file ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
            drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/30",
          )}
        >
          <input
            type="file"
            className="hidden"
            accept={allowed.join(",")}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <FileUp className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <div className="font-medium">גרור/י קובץ לכאן או לחץ/י לבחירה</div>
          <div className="mt-1 text-xs text-muted-foreground">סיומות מותרות: {allowed.join(", ")}</div>
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-6 w-6 text-emerald-500" />
            <div>
              <div className="font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · אומת</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setFile(null)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )}

      {validating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> מעבד ומאמת קובץ...
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}

/* -------------------- Step 3: Summary -------------------- */
function SummaryStep({
  items, total, agreed, setAgreed,
}: { items: CheckoutItem[]; total: number; agreed: boolean; setAgreed: (v: boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">סיכום ההזמנה</h3>
      </div>
      <div className="rounded-lg border border-border/60 divide-y">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-muted-foreground">כמות: {it.quantity}</div>
            </div>
            <div className="font-medium">₪{(it.unit_price * it.quantity).toFixed(2)}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">אין פריטים בעגלה</div>
        )}
      </div>
      <Separator />
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>סך הכל</span>
        <span>₪{total.toFixed(2)}</span>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
        <span className="text-sm leading-relaxed">
          אני מאשר/ת כי קראתי והסכמתי ל<a href="/terms" className="underline">תנאי השירות</a> ול<a href="/accessibility" className="underline">מדיניות הנגישות</a> של האתר.
        </span>
      </label>
    </div>
  );
}

/* -------------------- Step 4: Payment -------------------- */
function PaymentStep({ total, paying, onPay }: { total: number; paying: boolean; onPay: () => void }) {
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "" });
  const valid = card.number.replace(/\s/g, "").length >= 12 && card.name && card.exp && card.cvc.length >= 3;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">תשלום מאובטח</h3>
        <Badge variant="secondary" className="text-[10px]"><Lock className="ml-1 h-3 w-3" />SSL</Badge>
      </div>

      <div className="space-y-3">
        <div>
          <Label>מספר כרטיס</Label>
          <Input
            inputMode="numeric"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: e.target.value })}
            placeholder="1234 5678 9012 3456"
          />
        </div>
        <div>
          <Label>שם בעל הכרטיס</Label>
          <Input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="ISRAEL ISRAELI" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>תוקף (MM/YY)</Label>
            <Input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="08/29" />
          </div>
          <div>
            <Label>CVC</Label>
            <Input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" maxLength={4} />
          </div>
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>סך לתשלום</span>
        <span>₪{total.toFixed(2)}</span>
      </div>

      <Button className="w-full h-12 text-base" onClick={onPay} disabled={!valid || paying}>
        {paying ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />מעבד תשלום...</> : <><Lock className="ml-2 h-4 w-4" />שלם עכשיו ₪{total.toFixed(2)}</>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">התשלום מאובטח בתקן PCI-DSS · הפרטים מוצפנים</p>
    </div>
  );
}
