import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganTheme } from "@/hooks/useOrganTheme";

type Led = "blue" | "amber" | "red" | "green";
type ButtonDef = { code: string; label: string; led: Led };

const FALLBACK_BUTTONS: ButtonDef[] = [
  { code: "Intro_1", label: "Intro I", led: "blue" },
  { code: "Intro_2", label: "Intro II", led: "blue" },
  { code: "Intro_3", label: "Intro III", led: "blue" },
  { code: "Main_A", label: "Main A", led: "amber" },
  { code: "Main_B", label: "Main B", led: "amber" },
  { code: "Main_C", label: "Main C", led: "amber" },
  { code: "Main_D", label: "Main D", led: "amber" },
  { code: "Ending_1", label: "Ending I", led: "red" },
  { code: "Ending_2", label: "Ending II", led: "red" },
  { code: "Ending_3", label: "Ending III", led: "red" },
];

const LED_GLOW: Record<Led, string> = {
  blue: "0 0 12px 2px rgba(56,189,248,0.9)",
  amber: "0 0 12px 2px rgba(251,191,36,0.95)",
  red: "0 0 12px 2px rgba(239,68,68,0.9)",
  green: "0 0 12px 2px rgba(52,211,153,0.9)",
};

/**
 * Skeuomorphic Virtual Organ preview.
 * Accepts a samples map (button code → audio URL) or a single fallback audio URL.
 * Re-skins itself per keyboard model via useOrganTheme(modelId).
 */
export function VirtualOrganPreview({
  samples,
  fallbackAudio,
  modelId,
}: {
  samples?: Record<string, string>;
  fallbackAudio?: string | null;
  modelId?: string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { theme } = useOrganTheme(modelId);

  const buttons: ButtonDef[] = useMemo(() => {
    const list = theme.buttons.list ?? [];
    const mapped: ButtonDef[] = list
      .filter((b) => b.group === "INTRO" || b.group === "MAIN" || b.group === "ENDING")
      .map((b) => ({ code: b.code, label: b.label, led: (b.led as Led) ?? "blue" }));
    return mapped.length ? mapped : FALLBACK_BUTTONS;
  }, [theme]);

  const intros = buttons.filter((b) => b.code.startsWith("Intro"));
  const mains = buttons.filter((b) => b.code.startsWith("Main"));
  const endings = buttons.filter((b) => b.code.startsWith("Ending"));

  const ledColor = (led: Led): string => {
    switch (led) {
      case "blue": return theme.buttons.ledBlue;
      case "amber": return theme.buttons.ledAmber;
      case "red": return theme.buttons.ledRed;
      case "green": return theme.buttons.ledGreen;
    }
  };

  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "none";
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, []);

  const play = (code: string) => {
    const url = samples?.[code] || fallbackAudio || "";
    const a = audioRef.current;
    if (!a) return;
    if (active === code) { a.pause(); setActive(null); return; }
    if (!url) { setActive(code); return; }
    const swap = () => {
      a.src = url;
      a.currentTime = 0;
      a.volume = 1;
      a.play().catch(() => {});
    };
    if (!a.paused) { a.pause(); }
    swap();
    setActive(code);
  };

  const stopAll = () => {
    audioRef.current?.pause();
    setActive(null);
  };

  return (
    <div
      dir="ltr"
      className="rounded-2xl border border-amber-500/30 p-4 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_40px_-20px_rgba(0,0,0,0.8)]"
      style={{ background: theme.chassis.bgImage ? `url(${theme.chassis.bgImage}) center/cover` : theme.chassis.bg }}
    >
      <div className="mb-4 flex items-center justify-between" style={{ color: theme.topBanner.textColor }}>
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em]">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          {theme.brandText} · Virtual Organ
        </div>
        <button
          onClick={stopAll}
          className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          <Square className="h-3 w-3" /> Stop
        </button>
      </div>

      {intros.length > 0 && <OrganRow title="INTRO" buttons={intros} active={active} onPlay={play} theme={theme} ledColor={ledColor} />}
      {mains.length > 0 && <OrganRow title="MAIN" buttons={mains} active={active} onPlay={play} theme={theme} ledColor={ledColor} />}
      {endings.length > 0 && <OrganRow title="ENDING" buttons={endings} active={active} onPlay={play} theme={theme} ledColor={ledColor} />}

      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        Tap a pad to audition · Loops seamlessly
      </p>
    </div>
  );
}

function OrganRow({
  title,
  buttons,
  active,
  onPlay,
  theme,
  ledColor,
}: {
  title: string;
  buttons: ButtonDef[];
  active: string | null;
  onPlay: (code: string) => void;
  theme: ReturnType<typeof useOrganTheme>["theme"];
  ledColor: (l: Led) => string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 px-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">{title}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${buttons.length}, minmax(0, 1fr))` }}>
        {buttons.map((b) => {
          const isOn = active === b.code;
          return (
            <button
              key={b.code}
              onClick={() => onPlay(b.code)}
              className={cn(
                "group relative h-16 select-none rounded-lg border text-xs font-semibold transition-all",
                "border-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_#000,0_4px_10px_rgba(0,0,0,0.6)]",
                "active:translate-y-[1px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_0_#000,0_2px_4px_rgba(0,0,0,0.6)]",
                "hover:border-amber-500/40",
                isOn && "border-amber-400/80"
              )}
              style={{
                background: theme.buttons.bg,
                color: isOn ? ledColor(b.led) : theme.buttons.textColor,
              }}
            >
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full transition-all"
                style={{
                  background: isOn ? ledColor(b.led) : "#3f3f46",
                  boxShadow: isOn ? LED_GLOW[b.led] : undefined,
                }}
              />
              <Play className={cn("absolute left-1.5 top-1.5 h-3 w-3 opacity-50", isOn && "opacity-90")} />
              <span className="block pt-3">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
