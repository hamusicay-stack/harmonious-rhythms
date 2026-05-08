import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Folder, FolderOpen, Loader2, Music2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useSmartRhythms } from "./SmartRhythmsContext";
import {
  SmartRhythmsTheme,
  SrChip,
  SrKey,
  SrLabel,
  SrPanel,
  SrReadout,
  type LedColor,
} from "./SmartRhythmsTheme";
import { cn } from "@/lib/utils";

type RhythmSet = {
  id: string;
  set_name: string;
  description: string | null;
  price: number;
  creator_name: string;
  brand_id: string;
  requires_info_file: boolean;
  info_file_extension: string | null;
};

type AudioSample = {
  id: string;
  set_id: string;
  button_type: string;
  audio_url: string;
};

type ButtonDef = { code: string; label: string; led: LedColor };

const INTROS: ButtonDef[] = [
  { code: "Intro_1", label: "Intro I", led: "blue" },
  { code: "Intro_2", label: "Intro II", led: "blue" },
  { code: "Intro_3", label: "Intro III", led: "blue" },
];
const MAINS: ButtonDef[] = [
  { code: "Main_A", label: "Main A", led: "green" },
  { code: "Main_B", label: "Main B", led: "green" },
  { code: "Main_C", label: "Main C", led: "green" },
  { code: "Main_D", label: "Main D", led: "green" },
];
const FILLS: ButtonDef[] = [
  { code: "Fill_AA", label: "Fill In AA", led: "amber" },
  { code: "Fill_BB", label: "Fill In BB", led: "amber" },
  { code: "Fill_CC", label: "Fill In CC", led: "amber" },
  { code: "Fill_DD", label: "Fill In DD", led: "amber" },
];
const ENDINGS: ButtonDef[] = [
  { code: "Ending_1", label: "Ending I", led: "red" },
  { code: "Ending_2", label: "Ending II", led: "red" },
  { code: "Ending_3", label: "Ending III", led: "red" },
];

export function VisualOrganInterface({ onBack }: { onBack?: () => void }) {
  const { selectedModel } = useSmartRhythms();
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [samples, setSamples] = useState<Record<string, AudioSample[]>>({});
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!selectedModel) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: setsData } = await supabase
        .from("rhythm_sets")
        .select("*")
        .eq("brand_id", selectedModel.brand_id)
        .order("set_name", { ascending: true });
      const ids = (setsData ?? []).map((s) => s.id);
      let samplesData: AudioSample[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("set_audio_samples")
          .select("*")
          .in("set_id", ids);
        samplesData = (data ?? []) as AudioSample[];
      }
      if (!mounted) return;
      setSets((setsData ?? []) as RhythmSet[]);
      const grouped: Record<string, AudioSample[]> = {};
      samplesData.forEach((s) => {
        (grouped[s.set_id] ||= []).push(s);
      });
      setSamples(grouped);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [selectedModel]);

  const activeSet = useMemo(
    () => sets.find((s) => s.id === activeSetId) ?? null,
    [sets, activeSetId],
  );

  const sampleMap = useMemo(() => {
    const map = new Map<string, string>();
    if (activeSetId) {
      (samples[activeSetId] ?? []).forEach((s) => map.set(s.button_type, s.audio_url));
    }
    return map;
  }, [samples, activeSetId]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setActiveBtn(null);
  };

  const playSample = (btn: ButtonDef) => {
    const url = sampleMap.get(btn.code);
    if (!activeSet) {
      toast.info("בחר ערכת קצב מהמסך");
      return;
    }
    if (!url) {
      toast.info(`אין דגימה ל-${btn.label}`);
      stop();
      return;
    }
    if (activeBtn === btn.code) {
      stop();
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => toast.error("שגיאה בהשמעה"));
    setActiveBtn(btn.code);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setActiveBtn(null);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, []);

  useEffect(() => () => stop(), []);

  const handleAddToCart = () => {
    if (!activeSet) {
      toast.info("בחר ערכת קצב להוספה");
      return;
    }
    add({
      id: `rhythm:${activeSet.id}`,
      slug: activeSet.id,
      title: activeSet.set_name,
      price: Number(activeSet.price) || 0,
      image: null,
      product_type: "rhythm_set",
    });
    toast.success(`${activeSet.set_name} נוסף לסל`);
  };

  const renderButtonRow = (defs: ButtonDef[], group: string) => (
    <div className="flex flex-col gap-2">
      <SrLabel>{group}</SrLabel>
      <div className={cn("grid gap-2", defs.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {defs.map((b) => {
          const has = sampleMap.has(b.code);
          const lit = activeBtn === b.code;
          return (
            <SrKey
              key={b.code}
              led={b.led}
              lit={lit}
              pulse={lit}
              ledDot
              disabled={!activeSet}
              onClick={() => playSample(b)}
              className="text-[0.7rem] sm:text-xs px-2 py-3"
              style={{ opacity: !activeSet ? 0.4 : has ? 1 : 0.7 }}
            >
              {b.label}
            </SrKey>
          );
        })}
      </div>
    </div>
  );

  return (
    <SmartRhythmsTheme dir="rtl" className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <SrKey onClick={onBack} className="!min-h-[2.2rem] !px-3">
                <ArrowRight className="h-4 w-4" />
                חזרה
              </SrKey>
            )}
            <div>
              <SrLabel>Selected Keyboard</SrLabel>
              <div className="text-lg font-semibold">
                {selectedModel?.brand?.name} · {selectedModel?.model_name}
              </div>
            </div>
          </div>
          <SrChip>
            <span className="sr-led-dot" style={{ background: "var(--sr-led-green)", boxShadow: "0 0 6px var(--sr-led-green)" }} />
            POWER ON
          </SrChip>
        </div>

        {/* LCD SCREEN */}
        <SrPanel className="!p-3 sm:!p-4">
          <div
            className="rounded-lg p-4 sm:p-6 min-h-[260px]"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.22 0.07 230) 0%, oklch(0.14 0.06 235) 100%)",
              boxShadow:
                "inset 0 2px 12px oklch(0 0 0 / 0.7), inset 0 -1px 0 oklch(1 0 0 / 0.05), 0 0 0 1px oklch(0 0 0 / 0.6)",
              border: "1px solid oklch(0 0 0 / 0.7)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <SrReadout className="!py-1 !px-3 text-xs">
                {activeSet ? activeSet.set_name.toUpperCase() : "SELECT RHYTHM SET"}
              </SrReadout>
              <div className="text-xs sr-mono" style={{ color: "var(--sr-led-blue)", textShadow: "0 0 8px var(--sr-led-blue)" }}>
                {sets.length.toString().padStart(3, "0")} SETS
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-44 gap-2" style={{ color: "var(--sr-led-blue)" }}>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-mono text-sm">LOADING…</span>
              </div>
            ) : sets.length === 0 ? (
              <div className="flex items-center justify-center h-44 sr-mono text-sm" style={{ color: "var(--sr-led-blue)" }}>
                NO SETS AVAILABLE FOR THIS MODEL
              </div>
            ) : openFolderId ? (
              <div>
                <button
                  type="button"
                  onClick={() => setOpenFolderId(null)}
                  className="text-xs sr-mono mb-3 inline-flex items-center gap-1 hover:underline"
                  style={{ color: "var(--sr-led-amber)" }}
                >
                  <ArrowRight className="h-3 w-3" /> חזרה לערכות
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sets
                    .filter((s) => s.id === openFolderId)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setActiveSetId(s.id);
                          stop();
                        }}
                        className={cn(
                          "rounded-md text-start p-3 transition-all sr-mono text-xs",
                          "border",
                        )}
                        style={{
                          background: activeSetId === s.id
                            ? "oklch(0.18 0.10 230)"
                            : "oklch(0.10 0.04 235)",
                          color: "var(--sr-led-blue)",
                          textShadow: "0 0 6px color-mix(in oklab, var(--sr-led-blue) 60%, transparent)",
                          borderColor: activeSetId === s.id
                            ? "color-mix(in oklab, var(--sr-led-blue) 50%, transparent)"
                            : "oklch(0 0 0 / 0.6)",
                          boxShadow: activeSetId === s.id
                            ? "0 0 12px -2px var(--sr-led-blue)"
                            : "inset 0 1px 0 oklch(1 0 0 / 0.04)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Music2 className="h-3.5 w-3.5" />
                          <span className="font-semibold">{s.set_name}</span>
                        </div>
                        <div className="opacity-70 text-[0.65rem]">
                          {s.creator_name} · ${Number(s.price).toFixed(2)}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sets.map((s) => {
                  const isActive = activeSetId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setOpenFolderId(s.id);
                        setActiveSetId(s.id);
                        stop();
                      }}
                      className="group rounded-md p-3 flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5"
                      style={{
                        background: "oklch(0.10 0.04 235)",
                        border: "1px solid oklch(0 0 0 / 0.55)",
                        color: isActive ? "var(--sr-led-amber)" : "var(--sr-led-blue)",
                        textShadow: `0 0 8px color-mix(in oklab, ${isActive ? "var(--sr-led-amber)" : "var(--sr-led-blue)"} 55%, transparent)`,
                        boxShadow: isActive
                          ? "0 0 14px -2px var(--sr-led-amber)"
                          : "inset 0 1px 0 oklch(1 0 0 / 0.04)",
                      }}
                      aria-label={s.set_name}
                    >
                      {isActive ? (
                        <FolderOpen className="h-9 w-9" strokeWidth={1.4} />
                      ) : (
                        <Folder className="h-9 w-9 group-hover:scale-105 transition-transform" strokeWidth={1.4} />
                      )}
                      <span className="sr-mono text-[0.7rem] font-semibold text-center leading-tight line-clamp-2">
                        {s.set_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SrPanel>

        {/* HARDWARE CONTROL PANEL + CART */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <SrPanel className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="sr-screw" /> <span className="sr-screw" />
              <SrLabel className="!text-[0.7rem]">STYLE CONTROL</SrLabel>
              <div className="flex-1" />
              <span className="sr-screw" /> <span className="sr-screw" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderButtonRow(INTROS, "Intro")}
              {renderButtonRow(ENDINGS, "Ending")}
              {renderButtonRow(MAINS, "Main Variation")}
              {renderButtonRow(FILLS, "Fill In")}
            </div>
          </SrPanel>

          {/* CART CTA */}
          <SrPanel className="flex flex-col gap-4">
            <SrLabel>Now Selected</SrLabel>
            <div
              className="rounded-md p-3 sr-mono text-sm"
              style={{
                background: "oklch(0.10 0.04 235)",
                border: "1px solid oklch(0 0 0 / 0.6)",
                color: "var(--sr-led-blue)",
                textShadow: "0 0 6px color-mix(in oklab, var(--sr-led-blue) 60%, transparent)",
                minHeight: 64,
              }}
            >
              {activeSet ? (
                <>
                  <div className="font-semibold">{activeSet.set_name}</div>
                  <div className="text-[0.7rem] opacity-70 mt-1">
                    {activeSet.creator_name}
                  </div>
                </>
              ) : (
                <span className="opacity-70">— NO SET SELECTED —</span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <SrLabel>Price</SrLabel>
              <div className="sr-mono text-2xl font-bold" style={{ color: "var(--sr-led-amber)", textShadow: "0 0 10px var(--sr-led-amber)" }}>
                ${activeSet ? Number(activeSet.price).toFixed(2) : "0.00"}
              </div>
            </div>

            <SrKey
              led="green"
              lit={!!activeSet}
              ledDot
              disabled={!activeSet}
              onClick={handleAddToCart}
              className="!py-4 text-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              הוסף קצב לסל
            </SrKey>

            {activeSet?.requires_info_file && (
              <SrChip className="self-start">
                דורש קובץ {activeSet.info_file_extension ?? ".n27"}
              </SrChip>
            )}
          </SrPanel>
        </div>
      </div>
    </SmartRhythmsTheme>
  );
}

export default VisualOrganInterface;
