import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingBag, Loader2, ArrowRight, ArrowLeft, Check, User, MapPin, Receipt, FileUp, FileCheck2, AlertTriangle, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatILS } from "@/lib/shopUtils";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRefCode } from "@/lib/affiliate";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/checkout")({
  head: () => ({
    meta: [
      { title: "תשלום — חנות המוזיקאי" },
      { name: "description", content: "סיום הזמנה ומסירת פרטי משלוח" },
    ],
  }),
  component: CheckoutPage,
});

const focusToCenter = (e: React.FocusEvent<HTMLElement>) => {
  // Smoothly bring the focused field above the on-screen keyboard
  setTimeout(() => {
    e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 80);
};

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || (profile?.display_name ?? ""),
        customer_email: f.customer_email || (user.email ?? ""),
        customer_phone: f.customer_phone || ((profile as any)?.phone ?? ""),
      }));
    }
  }, [user, profile]);

  const hasPhysical = useMemo(
    () => items.some((i) => i.product_type !== "digital" && i.product_type !== "rhythm_set"),
    [items],
  );
  const needsInfoFile = useMemo(() => items.some((i) => i.requires_info_file), [items]);
  const allowedExtensions = useMemo(() => {
    const exts = new Set<string>();
    items.forEach((i) => {
      if (i.requires_info_file) exts.add((i.info_file_extension || ".n27").toLowerCase());
    });
    if (exts.size === 0) exts.add(".n27");
    return Array.from(exts);
  }, [items]);

  const shipping = hasPhysical && subtotal < 500 && subtotal > 0 ? 35 : 0;
  const total = subtotal + shipping;

  // Stepper: 1 = details, 1.5 = info file (if any item requires it), 2 = shipping (if physical), 3 = review
  type StepKey = "details" | "info_file" | "shipping" | "review";
  const stepFlow: StepKey[] = useMemo(() => {
    const flow: StepKey[] = ["details"];
    if (needsInfoFile) flow.push("info_file");
    if (hasPhysical) flow.push("shipping");
    flow.push("review");
    return flow;
  }, [needsInfoFile, hasPhysical]);

  const stepMeta: Record<StepKey, { label: string; icon: typeof User }> = {
    details: { label: "פרטים", icon: User },
    info_file: { label: "קובץ זיהוי", icon: FileUp },
    shipping: { label: "משלוח", icon: MapPin },
    review: { label: "סיכום", icon: Receipt },
  };
  const [step, setStep] = useState<StepKey>("details");
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const validateDetails = (): string[] => {
    const errs: string[] = [];
    if (!form.customer_name.trim()) errs.push("שם מלא");
    if (!form.customer_email.trim()) errs.push("אימייל");
    else if (!/^\S+@\S+\.\S+$/.test(form.customer_email)) errs.push("אימייל תקין");
    if (!form.customer_phone.trim()) errs.push("טלפון");
    return errs;
  };
  const validateInfoFile = (): string[] => {
    if (!needsInfoFile) return [];
    if (!infoFile) return [`קובץ זיהוי (${allowedExtensions.join("/")})`];
    return [];
  };
  const validateShipping = (): string[] => {
    const errs: string[] = [];
    if (hasPhysical) {
      if (!form.address_line.trim()) errs.push("כתובת");
      if (!form.city.trim()) errs.push("עיר");
    }
    return errs;
  };

  const showErrors = (errs: string[]) => {
    if (errs.length === 0) return;
    toast.error("רגע, חסר תו אחד או שניים", {
      description: errs.map((e) => `• ${e}`).join("\n"),
    });
  };

  const idx = stepFlow.indexOf(step);
  const goNext = () => {
    const errs =
      step === "details" ? validateDetails() :
      step === "info_file" ? validateInfoFile() :
      step === "shipping" ? validateShipping() :
      [];
    if (errs.length) return showErrors(errs);
    if (idx < stepFlow.length - 1) setStep(stepFlow[idx + 1]);
  };
  const goBack = () => {
    if (idx > 0) setStep(stepFlow[idx - 1]);
  };

  const handleFile = useCallback((f: File) => {
    const lower = f.name.toLowerCase();
    const ok = allowedExtensions.some((ext) => lower.endsWith(ext));
    if (!ok) {
      toast.error(`קובץ לא נתמך. רק ${allowedExtensions.join(", ")} מותרים.`);
      return;
    }
    setInfoFile(f);
    toast.success("הקובץ אומת בהצלחה");
  }, [allowedExtensions]);

  const submit = async () => {
    const errs = [...validateDetails(), ...validateInfoFile(), ...validateShipping()];
    if (errs.length) return showErrors(errs);
    if (items.length === 0) return toast.error("ארגז הציוד ריק — נסו להוסיף משהו קודם");

    setSubmitting(true);
    try {
      // Upload the optional info file first so its URL persists with the order
      let infoFileUrl: string | null = null;
      let infoFileName: string | null = null;
      if (needsInfoFile && infoFile) {
        setUploadingFile(true);
        const safeName = infoFile.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user?.id ?? "anon"}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("rhythm-files")
          .upload(path, infoFile, { upsert: false, contentType: infoFile.type || "application/octet-stream" });
        setUploadingFile(false);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("rhythm-files").getPublicUrl(path);
        infoFileUrl = pub.publicUrl;
        infoFileName = infoFile.name;
      }

      const order_number = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderErr } = await supabase
        .from("shop_orders")
        .insert({
          order_number,
          customer_id: user?.id ?? null,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          subtotal,
          shipping_amount: shipping,
          total_amount: total,
          shipping_address: hasPhysical ? {
            address_line: form.address_line,
            city: form.city,
            postal_code: form.postal_code,
          } : null,
          notes: form.notes || null,
          status: "pending",
          payment_status: "pending",
          info_file_url: infoFileUrl,
          info_file_name: infoFileName,
        } as any)
        .select("id, order_number")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Order failed");

      const orderItems = items.map((it) => ({
        order_id: order.id,
        product_id: it.id,
        product_title: it.title,
        product_type: it.product_type as any,
        quantity: it.qty,
        unit_price: it.price,
        total_price: it.price * it.qty,
      }));
      const { error: itemsErr } = await supabase.from("shop_order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      const refCode = getActiveRefCode();
      if (refCode) {
        await Promise.all(items.map((it) =>
          supabase.rpc("record_affiliate_conversion", {
            _ref_code: refCode,
            _scope_type: "shop_product",
            _scope_id: it.id,
            _order_amount: it.price * it.qty,
            _user_id: user?.id ?? undefined,
            _notes: `order:${order.order_number}`,
            _order_id: order.id,
          }).then(({ error }) => { if (error) console.warn("affiliate conv error", error); })
        ));
      }

      clear();
      toast.success("הזמנתכם נקלטה — נחתם במאסטר ✓");
      navigate({ to: "/shop/order/$orderId", params: { orderId: order.id } });
    } catch (e: any) {
      toast.error(e.message ?? "נראה שיש זיוף קטן בהזמנה — בואו ננסה שוב");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">ארגז הציוד עוד ריק</h1>
          <p className="mt-2 text-muted-foreground">בחרו את הציוד הבא שלכם — ואנחנו ננגן את שאר השלבים</p>
          <Link to="/shop"><Button className="mt-4">לחנות הציוד</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 md:px-8 md:py-8" dir="rtl">
        <Link to="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> המשך קניות
        </Link>
        <h1 className="mb-4 text-2xl font-bold md:text-3xl">סיום הסשן — קופה</h1>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-between gap-2">
          {stepFlow.map((sk, i) => {
            const meta = stepMeta[sk];
            const Icon = meta.icon;
            const isActive = step === sk;
            const isDone = i < idx;
            return (
              <div key={sk} className="flex flex-1 items-center gap-2">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  isActive && "border-primary bg-primary text-primary-foreground shadow-gold",
                  isDone && "border-primary bg-primary/20 text-primary",
                  !isActive && !isDone && "border-border bg-muted text-muted-foreground",
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className={cn("text-xs font-semibold whitespace-nowrap", !isActive && "text-muted-foreground")}>
                  {meta.label}
                </div>
                {i < stepFlow.length - 1 && (
                  <div className={cn("h-[2px] flex-1 rounded-full", isDone ? "bg-primary/60" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-4 md:p-5">
            {step === 1 && (
              <>
                <h2 className="mb-4 text-lg font-bold">פרטי לקוח</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="cust-name">שם מלא *</Label>
                    <Input
                      id="cust-name"
                      autoComplete="name"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cust-phone">טלפון *</Label>
                    <Input
                      id="cust-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      value={form.customer_phone}
                      onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="cust-email">אימייל *</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      dir="ltr"
                      value={form.customer_email}
                      onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && hasPhysical && (
              <>
                <h2 className="mb-4 text-lg font-bold">כתובת למשלוח</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="addr">כתובת *</Label>
                    <Input
                      id="addr"
                      autoComplete="street-address"
                      placeholder="רחוב ומספר בית"
                      value={form.address_line}
                      onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">עיר *</Label>
                    <Input
                      id="city"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">מיקוד</Label>
                    <Input
                      id="zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.postal_code}
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                      onFocus={focusToCenter}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="mb-4 text-lg font-bold">סיכום ואישור</h2>
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">פרטי לקוח</div>
                    <div className="font-medium">{form.customer_name}</div>
                    <div className="text-muted-foreground">{form.customer_email} · {form.customer_phone}</div>
                  </div>
                  {hasPhysical && (
                    <div className="border-t pt-3">
                      <div className="mb-1 text-xs font-semibold text-muted-foreground">כתובת למשלוח</div>
                      <div>{form.address_line}, {form.city}{form.postal_code ? `, ${form.postal_code}` : ""}</div>
                    </div>
                  )}
                </div>
                <div className="mt-5">
                  <Label htmlFor="notes">הערות להזמנה (אופציונלי)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    onFocus={focusToCenter}
                  />
                </div>
                <div className="mt-5 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                  💳 התשלום הדיגיטלי בדרך לבמה. בינתיים, ההזמנה נשמרת במצב "ממתין לתשלום" וצוות החנות יוצר איתכם קשר אישית לסגירה.
                </div>
              </>
            )}

            {/* Step navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={goBack} className="gap-1">
                  <ArrowRight className="h-4 w-4" />
                  חזור
                </Button>
              ) : <span />}

              {step < 3 ? (
                <Button type="button" onClick={goNext} size="lg" className="gap-1">
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting} size="lg" className="gap-1">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  אשרו וסגרו את הסשן
                </Button>
              )}
            </div>
          </Card>

          <Card className="h-fit p-5 lg:sticky lg:top-20">
            <h2 className="mb-4 text-lg font-bold">סיכום הזמנה</h2>
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.id} className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.image && <img src={it.image} alt={it.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{it.title}</p>
                    <p className="text-xs text-muted-foreground">כמות: {it.qty}</p>
                  </div>
                  <div className="text-sm font-bold">{formatILS(it.price * it.qty)}</div>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><span>סכום ביניים</span><span>{formatILS(subtotal)}</span></div>
              <div className="flex justify-between">
                <span>משלוח</span>
                <span>{shipping === 0 ? <span className="text-emerald-600 font-semibold">חינם</span> : formatILS(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-bold">סה"כ לתשלום</span>
                <span className="font-bold text-primary">{formatILS(total)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
