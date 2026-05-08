import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Copy, FileText, Folder as FolderIcon, FolderOpen, Heart, Loader2, MenuSquare, Music2, Play, Save, Scissors, ShoppingCart, Square, Trash2, ClipboardPaste } from "lucide-react";
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
import tyros5Image from "@/assets/tyros5-hardware.jpg";

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

  // Hardware theme variant per keyboard model
  const hwTheme = useMemo(() => {
    const name = `${selectedModel?.brand?.name ?? ""} ${selectedModel?.model_name ?? ""}`.toLowerCase();
    if (/tyros/.test(name)) {
      return {
        variant: "tyros" as const,
        panelBg: "linear-gradient(180deg, oklch(0.94 0.005 260) 0%, oklch(0.84 0.008 260) 55%, oklch(0.74 0.010 260) 100%)",
        panelBorder: "oklch(0.55 0.010 260 / 0.55)",
        headerBg: "linear-gradient(180deg, oklch(0.55 0.012 260) 0%, oklch(0.30 0.010 260) 100%)",
        headerText: "oklch(0.98 0.005 260)",
        lcdBg: "linear-gradient(180deg, oklch(0.80 0.010 260) 0%, oklch(0.68 0.012 260) 100%)",
        lcdText: "oklch(0.18 0.025 260)",
      };
    }
    return {
      variant: "genos" as const,
      panelBg: "linear-gradient(180deg, oklch(0.28 0.008 260) 0%, oklch(0.18 0.010 260) 55%, oklch(0.10 0.012 260) 100%)",
      panelBorder: "oklch(0 0 0 / 0.7)",
      headerBg: "linear-gradient(180deg, oklch(0.72 0.16 55) 0%, oklch(0.58 0.17 45) 100%)",
      headerText: "oklch(1 0 0)",
      lcdBg: "linear-gradient(180deg, oklch(0.18 0.012 260) 0%, oklch(0.10 0.012 260) 100%)",
      lcdText: "oklch(0.95 0.005 260)",
    };
  }, [selectedModel]);

  const navLevel: "sets" | "folders" | "items" =
    !activeSetId ? "sets" : !activeFolderId ? "folders" : "items";

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setActiveBtn(null);
  };

  const goUp = () => {
    if (navLevel === "items") { setActiveFolderId(null); setActiveItemId(null); stop(); }
    else if (navLevel === "folders") { setActiveSetId(null); setActiveItemId(null); stop(); }
  };
  const lcdTitle = !activeSetId
    ? "STYLE — SELECT SET"
    : activeFolderId
    ? `${(sets.find(s => s.id === activeSetId)?.set_name ?? "").toUpperCase()} / ${(folders.find((f) => f.id === activeFolderId)?.name ?? "").toUpperCase()}`
    : (sets.find(s => s.id === activeSetId)?.set_name ?? "").toUpperCase();

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

  const renderHwBtn = (b: ButtonDef) => {
    const has = sampleMap.has(b.code);
    const lit = activeBtn === b.code;
    return (
      <button
        key={b.code}
        type="button"
        onClick={() => playSample(b)}
        disabled={!activeSet}
        data-lit={lit ? "true" : undefined}
        className={cn("yo-btn", `yo-led-${b.led}`)}
        style={{ opacity: !activeSet ? 0.4 : has ? 1 : 0.6 }}
      >
        <span className="yo-btn-led" aria-hidden />
        {b.label}
      </button>
    );
  };

  const renderHwGroup = (label: string, defs: ButtonDef[], cols: number) => (
    <div className="yo-group">
      <div className="yo-group-row" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {defs.map(renderHwBtn)}
      </div>
      <div className="yo-group-label">{label}</div>
    </div>
  );

  return (
    <SmartRhythmsTheme dir="rtl" className="yo-root min-h-screen p-4 sm:p-8">
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

        {/* LCD SCREEN — Yamaha skeuomorphic */}
        {hwTheme.variant === "tyros" ? (
          <div className="space-y-4">
            {/* Tyros 5 hardware photo */}
            <div className="flex justify-center">
              <img
                src={tyros5Image}
                alt="Yamaha Tyros 5"
                className="max-w-full w-full sm:max-w-2xl rounded-lg shadow-2xl ring-1 ring-black/60"
                loading="lazy"
              />
            </div>
            <div className="yo-bezel" data-hw="tyros">
            {/* YAMAHA · STYLE brand header */}
            <div className="yo-tyros-brand">
              <span className="yo-tyros-yamaha">
                <span className="yo-tyros-fork" aria-hidden />
                YAMAHA
              </span>
              <span className="yo-tyros-style">STYLE</span>
            </div>

            <div className="yo-lcd" data-hw="tyros">
              {/* Tab strip */}
              <div className="yo-tyros-tabs">
                {(["PRESET", "USER", "HD1", "USB1"] as const).map((tab) => {
                  const active =
                    (navLevel === "sets" && tab === "PRESET") ||
                    (navLevel === "folders" && tab === "HD1") ||
                    (navLevel === "items" && tab === "HD1");
                  return (
                    <span key={tab} className="yo-tyros-tab" data-active={active ? "true" : undefined}>
                      {tab}
                    </span>
                  );
                })}
              </div>

              {/* Body */}
              <div className="p-3 sm:p-4 min-h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-44 gap-2 opacity-70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="sr-mono text-sm">LOADING…</span>
                  </div>
                ) : navLevel === "sets" ? (
                  sets.length === 0 ? (
                    <div className="flex items-center justify-center h-44 sr-mono text-sm opacity-70">
                      NO SETS AVAILABLE FOR THIS MODEL
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {sets.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setActiveSetId(s.id); setActiveFolderId(null); setActiveItemId(null); stop(); }}
                          className="yo-tyros-card"
                        >
                          {s.cover_image_url ? (
                            <div className="yo-tyros-thumb" style={{ backgroundImage: `url(${s.cover_image_url})` }} aria-hidden />
                          ) : (
                            <div className="yo-tyros-thumb flex items-center justify-center" style={{ background: "#dde1e6" }}>
                              <FolderIcon className="h-5 w-5 yo-tyros-folder-icon" />
                            </div>
                          )}
                          <span className="yo-tyros-name">{s.set_name}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : navLevel === "folders" ? (
                  setFolders_.length === 0 ? (
                    <div className="flex h-32 items-center justify-center sr-mono text-sm opacity-70">NO FOLDERS YET</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {setFolders_.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setActiveFolderId(f.id); setActiveItemId(null); }}
                          className="yo-tyros-card"
                        >
                          <FolderIcon className="h-9 w-9 yo-tyros-folder-icon shrink-0" strokeWidth={1.5} fill="#f0c14b" />
                          <span className="yo-tyros-name">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  folderItems.length === 0 ? (
                    <div className="flex h-32 items-center justify-center sr-mono text-sm opacity-70">EMPTY FOLDER</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {folderItems.map((it) => {
                        const isActive = activeItemId === it.id;
                        const fav = favorites.has(it.id);
                        const setCover = activeSet?.cover_image_url;
                        return (
                          <div key={it.id} className="yo-tyros-card" data-active={isActive ? "true" : undefined}>
                            <button
                              type="button"
                              onClick={() => setActiveItemId(it.id)}
                              className="flex flex-1 items-center gap-2.5 min-w-0 bg-transparent border-0 p-0 cursor-pointer"
                              style={{ color: "#1a1c22" }}
                            >
                              {setCover ? (
                                <div className="yo-tyros-thumb" style={{ backgroundImage: `url(${setCover})` }} aria-hidden />
                              ) : (
                                <div className="yo-tyros-thumb flex items-center justify-center" style={{ background: "#dde1e6" }}>
                                  <Music2 className="h-5 w-5" />
                                </div>
                              )}
                              <span className="yo-tyros-name">{it.name}</span>
                            </button>
                            <div className="yo-tyros-actions">
                              <button type="button" onClick={() => toggleFavorite(it.id)} aria-label="מועדף" className="yo-tyros-iconbtn">
                                <Heart className={cn("h-5 w-5", fav ? "fill-red-500 text-red-500" : "")} strokeWidth={2.2} />
                              </button>
                              <button type="button" onClick={() => setActiveItemId(it.id)} aria-label="play" className="yo-tyros-iconbtn">
                                <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Bottom bar */}
              <div className="yo-tyros-bottom">
                <div className="flex items-center gap-2">
                  <span className="yo-tyros-pbtn">P1</span>
                  <span className="yo-tyros-pbtn" data-muted="true">P2</span>
                </div>
                <button type="button" onClick={goUp} disabled={navLevel === "sets"} className="yo-tyros-up" aria-label="UP">
                  UP <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* File tools toolbar */}
            <div className="yo-tyros-toolbar">
              <div className="yo-tyros-tool"><FileText /><span>NAME</span></div>
              <div className="yo-tyros-tool"><Scissors /><span>CUT</span></div>
              <div className="yo-tyros-tool"><Copy /><span>COPY</span></div>
              <div className="yo-tyros-tool"><ClipboardPaste /><span>PASTE</span></div>
              <div className="yo-tyros-tool"><Trash2 /><span>DELETE</span></div>
              <div className="yo-tyros-tool"><Save /><span>SAVE</span></div>
              <div className="yo-tyros-tool"><FolderOpen /><span>FOLDER</span></div>
              <div className="yo-tyros-tool" data-menu="true"><MenuSquare /><span className="yo-tyros-tool-pill">MENU 2</span></div>
            </div>
            </div>
          </div>
        ) : (
          <div className="yo-bezel">
            <div className="yo-lcd">
              {/* Header bar */}
              <div className="yo-lcd-header px-3 sm:px-4 pt-2 pb-0 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderIcon className="h-4 w-4 shrink-0" />
                    <span className="font-semibold tracking-wide text-sm truncate">{lcdTitle || "STYLE"}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[0.62rem] font-bold tracking-widest opacity-95">
                    <span>SEARCH</span><span>QQ</span><span>BEST</span><span>×</span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-end gap-1">
                  {(["PRESET", "USER", "HD1", "USB1"] as const).map((tab) => {
                    const active =
                      (navLevel === "sets" && tab === "PRESET") ||
                      (navLevel === "folders" && tab === "HD1") ||
                      (navLevel === "items" && tab === "USB1");
                    return (
                      <span key={tab} className="yo-lcd-tab" data-active={active ? "true" : undefined}>
                        {tab}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* LCD body */}
              <div className="p-3 sm:p-5 min-h-[300px] relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center h-44 gap-2 opacity-70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="sr-mono text-sm">LOADING…</span>
                  </div>
                ) : navLevel === "sets" ? (
                  sets.length === 0 ? (
                    <div className="flex items-center justify-center h-44 sr-mono text-sm opacity-70">
                      NO SETS AVAILABLE FOR THIS MODEL
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {sets.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setActiveSetId(s.id); setActiveFolderId(null); setActiveItemId(null); stop(); }}
                          className="yo-touch"
                        >
                          <FolderIcon className="h-7 w-7 shrink-0" style={{ color: "var(--yo-orange)" }} strokeWidth={1.5} />
                          <span className="font-semibold text-sm truncate flex-1">{s.set_name}</span>
                          <span className="sr-mono text-[0.7rem] opacity-70">${Number(s.price).toFixed(0)}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : navLevel === "folders" ? (
                  setFolders_.length === 0 ? (
                    <div className="flex h-32 items-center justify-center sr-mono text-sm opacity-70">NO FOLDERS YET</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {setFolders_.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setActiveFolderId(f.id); setActiveItemId(null); }}
                          className="yo-touch"
                        >
                          <FolderIcon className="h-7 w-7 shrink-0" style={{ color: "var(--yo-orange)" }} strokeWidth={1.5} />
                          <span className="font-semibold text-sm truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  folderItems.length === 0 ? (
                    <div className="flex h-32 items-center justify-center sr-mono text-sm opacity-70">EMPTY FOLDER</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {folderItems.map((it) => {
                        const isActive = activeItemId === it.id;
                        const fav = favorites.has(it.id);
                        return (
                          <div key={it.id} className="yo-touch" data-active={isActive ? "true" : undefined}>
                            <button type="button" onClick={() => setActiveItemId(it.id)} className="flex flex-1 items-center gap-2 text-start min-w-0">
                              <Music2 className="h-4 w-4 shrink-0" style={{ color: "var(--yo-led-amber)" }} />
                              <span className="font-semibold text-sm truncate">{it.name}</span>
                            </button>
                            <button type="button" onClick={() => toggleFavorite(it.id)} aria-label="מועדף" className="rounded p-1 transition hover:scale-110">
                              <Heart className={cn("h-4 w-4 transition", fav ? "fill-red-500 text-red-500" : "")} style={!fav ? { color: "rgba(255,255,255,0.55)" } : undefined} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Bottom bar with UP button */}
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 relative z-10"
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.7)",
                  background: "linear-gradient(180deg, #161927 0%, #0a0c14 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="rounded-md px-3 py-1 text-xs font-bold sr-mono"
                  style={{
                    color: "var(--yo-orange)",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(0,0,0,0.6)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  P1
                </span>
                <button
                  type="button"
                  onClick={goUp}
                  disabled={navLevel === "sets"}
                  className="yo-up-btn"
                  aria-label="UP"
                >
                  <ArrowUp className="h-3.5 w-3.5" /> UP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HARDWARE CONTROL PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="yo-hw-panel">
            <div className="flex items-center gap-2 mb-4">
              <span className="yo-screw" /> <span className="yo-screw" />
              <div className="flex-1 text-center">
                <span className="yo-group-label" style={{ margin: 0 }}>STYLE CONTROL</span>
              </div>
              <span className="yo-screw" /> <span className="yo-screw" />
            </div>

            <div className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
              {renderHwGroup("INTRO", INTROS, 3)}
              <div className="yo-divider hidden sm:block" />
              {renderHwGroup("MAIN VARIATION", MAINS, 4)}
              <div className="yo-divider hidden sm:block" />
              {renderHwGroup("FILL IN", FILLS, 4)}
              <div className="yo-divider hidden sm:block" />
              {renderHwGroup("ENDING", ENDINGS, 3)}
            </div>

            <div className="flex justify-center pt-5">
              <button
                type="button"
                onClick={stop}
                disabled={!activeBtn}
                data-lit={activeBtn ? "true" : undefined}
                className="yo-btn yo-led-red"
                style={{ minWidth: 140 }}
              >
                <span className="yo-btn-led" aria-hidden />
                <span className="inline-flex items-center gap-2"><Square className="h-3.5 w-3.5" /> STOP</span>
              </button>
            </div>
          </div>

          {/* Cart panel */}
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
