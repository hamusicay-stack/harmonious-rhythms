import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonDef = { code: string; label: string; led: "blue" | "amber" | "red" | "green" };

const BUTTONS: ButtonDef[] = [
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

const LED_COLORS: Record<ButtonDef["led"], string> = {
  blue: "bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.9)]",
  amber: "bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.95)]",
  red: "bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)]",
  green: "bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.9)]",
};

/**
 * Skeuomorphic Virtual Organ preview.
 * Accepts a samples map (button code → audio URL) or a single fallback audio URL.
 * Clicking a button plays its sample on loop; clicking another switches smoothly.
 */
export function VirtualOrganPreview({
  samples,
  fallbackAudio,
}: {
  samples?: Record<string, string>;
  fallbackAudio?: string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    // Smooth crossover: brief fade then swap source
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
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_40px_-20px_rgba(0,0,0,0.8)]"
    >
      {/* Brand bar */}
      <div className="mb-4 flex items-center justify-between text-amber-300/80">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em]">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          Virtual Organ · Preview
        </div>
        <button
          onClick={stopAll}
          className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          <Square className="h-3 w-3" /> Stop
        </button>
      </div>

      {/* Group: Intros */}
      <OrganRow title="INTRO" buttons={BUTTONS.slice(0, 3)} active={active} onPlay={play} />
      {/* Group: Mains */}
      <OrganRow title="MAIN" buttons={BUTTONS.slice(3, 7)} active={active} onPlay={play} />
      {/* Group: Endings */}
      <OrganRow title="ENDING" buttons={BUTTONS.slice(7, 10)} active={active} onPlay={play} />

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
}: {
  title: string;
  buttons: ButtonDef[];
  active: string | null;
  onPlay: (code: string) => void;
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
                "bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200",
                "border-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_#000,0_4px_10px_rgba(0,0,0,0.6)]",
                "active:translate-y-[1px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_0_#000,0_2px_4px_rgba(0,0,0,0.6)]",
                "hover:border-amber-500/40",
                isOn && "border-amber-400/80 from-zinc-600 to-zinc-800 text-amber-200"
              )}
            >
              {/* LED */}
              <span
                className={cn(
                  "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full transition-all",
                  isOn ? LED_COLORS[b.led] : "bg-zinc-700"
                )}
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
