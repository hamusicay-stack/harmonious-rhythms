import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Music2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "login" | "signup" } => ({
    mode: (search.mode as string) === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "התחברות / הרשמה — המוזיקאי" },
      { name: "description", content: "הצטרפו לקהילת המוזיקאים." },
      { property: "og:title", content: "התחברות / הרשמה — המוזיקאי" },
      { property: "og:description", content: "הצטרפו לקהילת המוזיקאים." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(search.mode as "login" | "signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/" });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast.success("ברוכים הבאים! נרשמתם בהצלחה");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("התחברתם בהצלחה");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "אירעה שגיאה";
      const friendly =
        message.includes("Invalid login credentials") ? "מייל או סיסמה שגויים" :
        message.includes("already registered") || message.includes("User already") ? "המייל כבר רשום" :
        message.includes("Password") ? "הסיסמה לא תקינה (לפחות 6 תווים)" :
        message;
      toast.error(friendly);
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
              <Music2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">
              {mode === "login" ? "ברוכים השבים" : "הצטרפו לקהילה"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "התחברו לחשבון שלכם" : "פתחו חשבון חינם"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="הזינו את שמכם"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">כתובת מייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                minLength={6}
                required
                dir="ltr"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
            >
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "התחברות" : "הרשמה"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "אין לכם חשבון? " : "כבר רשומים? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline"
              type="button"
            >
              {mode === "login" ? "הירשמו" : "התחברו"}
            </button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
