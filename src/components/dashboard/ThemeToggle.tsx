import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "system";
const KEY = "theme-mode";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && sysDark);
  root.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(KEY) as ThemeMode) || "system";
  });

  useEffect(() => {
    localStorage.setItem(KEY, mode);
    applyTheme(mode);
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [mode]);

  const opts: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "בהיר", icon: Sun },
    { value: "dark", label: "כהה", icon: Moon },
    { value: "system", label: "מערכת", icon: Monitor },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-1">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = mode === o.value;
        return (
          <Button
            key={o.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode(o.value)}
            className={
              active
                ? "h-8 gap-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-300"
                : "h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
