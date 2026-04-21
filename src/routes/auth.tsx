import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
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
  const [mode, setMode] = useState<"login" | "signup">("login");

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

          <form className="space-y-3">
            {mode === "signup" && <Input placeholder="שם מלא" />}
            <Input type="email" placeholder="כתובת מייל" />
            <Input type="password" placeholder="סיסמה" />
            <Button className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
              {mode === "login" ? "התחברות" : "הרשמה"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "אין לכם חשבון? " : "כבר רשומים? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary hover:underline"
            >
              {mode === "login" ? "הירשמו" : "התחברו"}
            </button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
