import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Music2, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "איפוס סיסמה — המוזיקאי" },
      { name: "description", content: "איפוס סיסמה באמצעות קוד חד-פעמי במייל." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("password-reset-request", {
        body: { email },
      });
      if (error) throw error;
      toast.success("שלחנו קוד אימות למייל (אם הוא רשום אצלנו)");
      setStep("otp");
    } catch (err) {
      toast.error("לא הצלחנו לשלוח קוד. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || password.length < 6) {
      toast.error("יש למלא קוד וסיסמה (לפחות 6 תווים)");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-verify", {
        body: { email, code, new_password: password },
      });
      if (error || (data as { error?: string })?.error) {
        const errKey = (data as { error?: string })?.error;
        const friendly =
          errKey === "code_invalid" ? "הקוד שגוי" :
          errKey === "code_expired" ? "הקוד פג תוקף — בקשו חדש" :
          errKey === "too_many_attempts" ? "יותר מדי ניסיונות. נסו שוב מאוחר יותר" :
          "שגיאה — נסו שוב";
        throw new Error(friendly);
      }
      toast.success("הסיסמה הוחלפה — ניתן להתחבר");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-16 md:px-8">
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card-elevated p-8 shadow-elegant md:p-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-gold">
              {step === "email" ? <Music2 className="h-6 w-6 text-primary-foreground" /> : <KeyRound className="h-6 w-6 text-primary-foreground" />}
            </div>
            <h1 className="font-display text-2xl font-bold">
              {step === "email" ? "שכחתם סיסמה?" : "הזינו את הקוד שקיבלתם"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "email" ? "נשלח אליכם קוד חד-פעמי במייל" : "תקף ל-15 דקות"}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">כתובת מייל</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" placeholder="name@example.com" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שלח לי קוד
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">קוד מהמייל</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required dir="ltr" inputMode="numeric" placeholder="6 ספרות" className="text-center text-lg tracking-widest" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} dir="ltr" placeholder="לפחות 6 תווים" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                החלף סיסמה
              </Button>
              <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-muted-foreground hover:text-foreground">
                שלחו לי קוד חדש
              </button>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
