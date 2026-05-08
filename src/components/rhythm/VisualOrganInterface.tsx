import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Folder as FolderIcon, Heart, Loader2, Music2, ShoppingCart, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
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
  cover_image_url: string | null;
};
type Folder = { id: string; set_id: string; name: string; sort_order: number };
type Item = { id: string; folder_id: string; name: string; sort_order: number };
type Sample = { id: string; set_id: string; rhythm_item_id: string | null; button_type: string; audio_url: string };

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
  const { user } = useAuth();
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
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
      const setIds = (setsData ?? []).map((s) => s.id);

      let foldersData: Folder[] = [];
      let itemsData: Item[] = [];
      let samplesData: Sample[] = [];
      if (setIds.length) {
        const { data: f } = await supabase
          .from("rhythm_folders")
          .select("*")
          .in("set_id", setIds)
          .order("sort_order");
        foldersData = (f ?? []) as Folder[];
        const folderIds = foldersData.map((x) => x.id);
        if (folderIds.length) {
          const { data: i } = await supabase
            .from("rhythm_items")
            .select("*")
            .in("folder_id", folderIds)
            .order("sort_order");
          itemsData = (i ?? []) as Item[];
        }
        const { data: smp } = await supabase
          .from("set_audio_samples")
          .select("*")
          .in("set_id", setIds);
        samplesData = (smp ?? []) as Sample[];
      }

      let favs = new Set<string>();
      if (user && itemsData.length) {
        const { data: favRows } = await supabase
          .from("rhythm_item_favorites")
          .select("rhythm_item_id")
          .eq("user_id", user.id)
          .in("rhythm_item_id", itemsData.map((i) => i.id));
        favs = new Set((favRows ?? []).map((x: any) => x.rhythm_item_id));
      }

      if (!mounted) return;
      setSets((setsData ?? []) as RhythmSet[]);
      setFolders(foldersData);
      setItems(itemsData);
      setSamples(samplesData);
      setFavorites(favs);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [selectedModel, user]);

  const activeSet = useMemo(() => sets.find((s) => s.id === activeSetId) ?? null, [sets, activeSetId]);
  const setFolders_ = useMemo(
    () => folders.filter((f) => f.set_id === activeSetId),
    [folders, activeSetId]
  );
  const folderItems = useMemo(
    () => items.filter((i) => i.folder_id === activeFolderId),
    [items, activeFolderId]
  );
  const sampleMap = useMemo(() => {
    const m = new Map<string, string>();
    if (activeItemId) {
      samples.filter((s) => s.rhythm_item_id === activeItemId).forEach((s) => m.set(s.button_type, s.audio_url));
    } else if (activeSetId) {
      // legacy: samples on set without rhythm_item_id
      samples
        .filter((s) => s.set_id === activeSetId && !s.rhythm_item_id)
        .forEach((s) => m.set(s.button_type, s.audio_url));
    }
    return m;
  }, [samples, activeItemId, activeSetId]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setActiveBtn(null);
  };

  const playSample = (btn: ButtonDef) => {
    if (!activeSet) {
      toast.info("בחר ערכת קצב");
      return;
    }
    if (activeBtn === btn.code) {
      stop();
      return;
    }
    const url = sampleMap.get(btn.code);
    if (!url) {
      toast.info(`אין דגימה ל-${btn.label}`);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.loop = true;
    audioRef.current.play().catch(() => toast.error("שגיאה בהשמעה"));
    setActiveBtn(btn.code);
  };

  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); }, [activeItemId, activeSetId]);

  const toggleFavorite = async (itemId: string) => {
    if (!user) { toast.info("יש להתחבר כדי לסמן מועדפים"); return; }
    const next = new Set(favorites);
    if (next.has(itemId)) {
      next.delete(itemId);
      setFavorites(next);
      await supabase.from("rhythm_item_favorites").delete().eq("user_id", user.id).eq("rhythm_item_id", itemId);
    } else {
      next.add(itemId);
      setFavorites(next);
      await supabase.from("rhythm_item_favorites").insert({ user_id: user.id, rhythm_item_id: itemId });
    }
  };

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
      image: activeSet.cover_image_url,
      product_type: "rhythm_set",
    });
    toast.success(`${activeSet.set_name} נוסף לסל`);
  };

  const renderRow = (defs: ButtonDef[], group: string) => (
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
              style={{ opacity: !activeSet ? 0.4 : has ? 1 : 0.55 }}
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
            className="rounded-lg p-4 sm:p-6 min-h-[320px]"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.22 0.07 230) 0%, oklch(0.14 0.06 235) 100%)",
              boxShadow:
                "inset 0 2px 12px oklch(0 0 0 / 0.7), inset 0 -1px 0 oklch(1 0 0 / 0.05), 0 0 0 1px oklch(0 0 0 / 0.6)",
              border: "1px solid oklch(0 0 0 / 0.7)",
            }}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <SrReadout className="!py-1 !px-3 text-xs truncate">
                {activeSet
                  ? activeFolderId
                    ? `${activeSet.set_name.toUpperCase()} / ${(setFolders_.find((f) => f.id === activeFolderId)?.name ?? "").toUpperCase()}`
                    : activeSet.set_name.toUpperCase()
                  : "SELECT RHYTHM SET"}
              </SrReadout>
              <div className="text-xs sr-mono shrink-0" style={{ color: "var(--sr-led-blue)", textShadow: "0 0 8px var(--sr-led-blue)" }}>
                {(activeSet ? setFolders_.length : sets.length).toString().padStart(3, "0")} {activeSet ? "FOLDERS" : "SETS"}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-44 gap-2" style={{ color: "var(--sr-led-blue)" }}>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="sr-mono text-sm">LOADING…</span>
              </div>
            ) : !activeSet ? (
              sets.length === 0 ? (
                <div className="flex items-center justify-center h-44 sr-mono text-sm" style={{ color: "var(--sr-led-blue)" }}>
                  NO SETS AVAILABLE FOR THIS MODEL
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {sets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSetId(s.id);
                        setActiveFolderId(null);
                        setActiveItemId(null);
                        stop();
                      }}
                      className="group rounded-md p-3 flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5"
                      style={{
                        background: "oklch(0.10 0.04 235)",
                        border: "1px solid oklch(0 0 0 / 0.55)",
                        color: "var(--sr-led-blue)",
                        textShadow: "0 0 8px color-mix(in oklab, var(--sr-led-blue) 55%, transparent)",
                        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)",
                      }}
                      aria-label={s.set_name}
                    >
                      <FolderIcon className="h-9 w-9 group-hover:scale-105 transition-transform" strokeWidth={1.4} />
                      <span className="sr-mono text-[0.7rem] font-semibold text-center leading-tight line-clamp-2">
                        {s.set_name}
                      </span>
                      <span className="sr-mono text-[0.6rem] opacity-70">${Number(s.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )
            ) : !activeFolderId ? (
              <div>
                <button
                  type="button"
                  onClick={() => { setActiveSetId(null); setActiveItemId(null); stop(); }}
                  className="text-xs sr-mono mb-3 inline-flex items-center gap-1 hover:underline"
                  style={{ color: "var(--sr-led-amber)" }}
                >
                  <ChevronLeft className="h-3 w-3" /> חזרה לערכות
                </button>
                {setFolders_.length === 0 ? (
                  <div className="flex h-32 items-center justify-center sr-mono text-sm" style={{ color: "var(--sr-led-blue)" }}>
                    NO FOLDERS YET
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {setFolders_.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setActiveFolderId(f.id); setActiveItemId(null); }}
                        className="flex items-center gap-2 rounded-md border p-3 transition-all hover:scale-[1.02]"
                        style={{
                          background: "oklch(0.10 0.04 235)",
                          color: "var(--sr-led-amber)",
                          borderColor: "color-mix(in oklab, var(--sr-led-amber) 30%, transparent)",
                        }}
                      >
                        <FolderIcon className="h-4 w-4" />
                        <span className="sr-mono text-xs">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => { setActiveFolderId(null); setActiveItemId(null); stop(); }}
                  className="text-xs sr-mono mb-3 inline-flex items-center gap-1 hover:underline"
                  style={{ color: "var(--sr-led-amber)" }}
                >
                  <ChevronLeft className="h-3 w-3" /> חזרה לתיקיות
                </button>
                {folderItems.length === 0 ? (
                  <div className="flex h-32 items-center justify-center sr-mono text-sm" style={{ color: "var(--sr-led-blue)" }}>
                    EMPTY FOLDER
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {folderItems.map((it) => {
                      const isActive = activeItemId === it.id;
                      const fav = favorites.has(it.id);
                      return (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-2 rounded-md border p-3"
                          style={{
                            background: isActive ? "oklch(0.18 0.10 230)" : "oklch(0.10 0.04 235)",
                            borderColor: isActive
                              ? "color-mix(in oklab, var(--sr-led-blue) 60%, transparent)"
                              : "color-mix(in oklab, var(--sr-led-blue) 25%, transparent)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveItemId(it.id)}
                            className="flex flex-1 items-center gap-2 text-start"
                            style={{
                              color: "var(--sr-led-blue)",
                              textShadow: isActive ? "0 0 10px var(--sr-led-blue)" : "0 0 6px color-mix(in oklab, var(--sr-led-blue) 50%, transparent)",
                            }}
                          >
                            <Music2 className="h-3.5 w-3.5" />
                            <span className="sr-mono text-xs">{it.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(it.id)}
                            aria-label="מועדף"
                            className="rounded p-1 transition"
                          >
                            <Heart className={cn("h-4 w-4 transition", fav ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              {renderRow(INTROS, "Intro")}
              {renderRow(ENDINGS, "Ending")}
              {renderRow(MAINS, "Main Variation")}
              {renderRow(FILLS, "Fill In")}
            </div>
            <div className="flex justify-center pt-2">
              <SrKey led="red" onClick={stop} disabled={!activeBtn} className="!min-h-[2.6rem] !px-6">
                <Square className="h-4 w-4" /> STOP
              </SrKey>
            </div>
          </SrPanel>

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
                  <div className="text-[0.7rem] opacity-70 mt-1">{activeSet.creator_name}</div>
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
