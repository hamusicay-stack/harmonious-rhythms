import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSmartRhythms, type SelectedModel } from "./SmartRhythmsContext";
import { SrChip, SrLabel } from "./SmartRhythmsTheme";
import { Loader2, Piano, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

type Brand = { id: string; name: string; logo_url: string | null };
type KeyboardModel = {
  id: string;
  brand_id: string;
  model_name: string;
  ui_image_url: string | null;
  brand?: Brand | null;
};

interface Props {
  onSelected?: (model: SelectedModel) => void;
  className?: string;
}

export function KeyboardModelSelector({ onSelected, className }: Props) {
  const { selectedModel, setSelectedModel } = useSmartRhythms();
  const [models, setModels] = useState<KeyboardModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: m, error: e1 }, { data: b, error: e2 }] = await Promise.all([
        supabase.from("keyboard_models" as any).select("*, brand:brands(*)").order("model_name"),
        supabase.from("brands" as any).select("*").order("name"),
      ]);
      if (e1) toast.error(e1.message);
      else setModels((m ?? []) as unknown as KeyboardModel[]);
      if (e2) toast.error(e2.message);
      else setBrands((b ?? []) as unknown as Brand[]);
      setLoading(false);
    })();
  }, []);

  const filtered = activeBrand === "all" ? models : models.filter((m) => m.brand_id === activeBrand);

  const pick = (m: KeyboardModel) => {
    setTransitioning(m.id);
    const sel: SelectedModel = {
      id: m.id,
      brand_id: m.brand_id,
      model_name: m.model_name,
      ui_image_url: m.ui_image_url,
      brand: m.brand ?? null,
    };
    setSelectedModel(sel);
    setTimeout(() => {
      onSelected?.(sel);
      setTransitioning(null);
    }, 420);
  };

  return (
    <div className={cn("smart-rhythms min-h-screen px-4 py-10 md:px-8 md:py-14", className)}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <SrLabel className="mb-3 inline-block">Step 01 · Select Instrument</SrLabel>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: "Inter, sans-serif" }}>
            בחר את הקליד שלך
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: "var(--sr-text-dim)" }}>
            הבחירה הזו תקבע את העיצוב, הקבצים והמקצבים המותאמים עבורך
          </p>
        </div>

        {/* Brand filter strip */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveBrand("all")}
            className={cn(
              "sr-key !min-h-[2.2rem] !py-1.5 !px-3 text-[0.7rem]",
              activeBrand === "all" && "sr-led-blue",
            )}
            data-lit={activeBrand === "all" ? "true" : undefined}
          >
            הכל
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBrand(b.id)}
              className={cn(
                "sr-key !min-h-[2.2rem] !py-1.5 !px-3 text-[0.7rem] sr-led-amber",
              )}
              data-lit={activeBrand === b.id ? "true" : undefined}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--sr-led-blue)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="sr-panel mx-auto max-w-md py-16 text-center">
            <Piano className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--sr-text-mute)" }} />
            <p style={{ color: "var(--sr-text-dim)" }}>לא נמצאו דגמים. הוסף דגמים מאזור הניהול.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                isSelected={selectedModel?.id === m.id}
                isTransitioning={transitioning === m.id}
                onClick={() => pick(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelCard({
  model,
  isSelected,
  isTransitioning,
  onClick,
}: {
  model: KeyboardModel;
  isSelected: boolean;
  isTransitioning: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "sr-card group relative flex w-full flex-col overflow-hidden rounded-2xl border text-start transition-all duration-300 ease-out",
        isTransitioning && "scale-[0.97] opacity-70",
      )}
      style={{
        background: "var(--sr-grad-panel)",
        borderColor: "var(--sr-edge)",
        boxShadow: "var(--sr-bevel-panel)",
      }}
    >
      {/* Glow ring on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in oklab, var(--sr-led-blue) 40%, transparent), 0 0 28px -4px color-mix(in oklab, var(--sr-led-blue) 55%, transparent), 0 0 60px -10px color-mix(in oklab, var(--sr-led-blue) 45%, transparent)",
        }}
      />
      {/* Top reflection line */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.22), transparent)" }}
      />

      {/* Image plate */}
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 40%, oklch(0.30 0.012 250) 0%, oklch(0.16 0.012 250) 90%)",
        }}
      >
        {model.ui_image_url ? (
          <img
            src={model.ui_image_url}
            alt={model.model_name}
            className="max-h-36 max-w-[88%] object-contain transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]"
            style={{ filter: "drop-shadow(0 14px 22px oklch(0 0 0 / 0.55))" }}
          />
        ) : (
          <Piano className="h-20 w-20" style={{ color: "var(--sr-text-mute)" }} />
        )}
        {/* Selected LED */}
        {isSelected && (
          <span
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest"
            style={{
              background: "oklch(0 0 0 / 0.55)",
              color: "var(--sr-led-green)",
              border: "1px solid color-mix(in oklab, var(--sr-led-green) 40%, oklch(0 0 0 / 0.6))",
              boxShadow: "0 0 12px color-mix(in oklab, var(--sr-led-green) 55%, transparent)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full sr-blink"
              style={{
                background: "var(--sr-led-green)",
                boxShadow: "0 0 6px var(--sr-led-green)",
              }}
            />
            ACTIVE
          </span>
        )}
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="sr-label mb-1">{model.brand?.name ?? "—"}</div>
            <div className="truncate text-lg font-semibold" style={{ color: "var(--sr-text)" }}>
              {model.model_name}
            </div>
          </div>
          {model.brand?.logo_url ? (
            <img
              src={model.brand.logo_url}
              alt={model.brand.name}
              className="h-7 max-w-[80px] object-contain opacity-80"
              style={{ filter: "brightness(1.6) contrast(1.05)" }}
            />
          ) : (
            <SrChip>{model.brand?.name?.slice(0, 3).toUpperCase()}</SrChip>
          )}
        </div>

        <div
          className="mt-1 flex items-center justify-between border-t pt-3 text-xs transition-colors"
          style={{ borderColor: "var(--sr-edge)", color: "var(--sr-text-mute)" }}
        >
          <span className="sr-label">Select Model</span>
          <ChevronLeft
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
            style={{ color: "var(--sr-led-blue)" }}
          />
        </div>
      </div>
    </button>
  );
}
