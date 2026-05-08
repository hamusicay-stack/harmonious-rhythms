import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, Folder, ChevronLeft, ShoppingCart, Square, Music2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSmartRhythms } from "./SmartRhythmsContext";
import { KeyboardModelSelector } from "./KeyboardModelSelector";
import { SmartRhythmsTheme, SrChip, SrKey, SrLabel, SrPanel, SrReadout, type LedColor } from "./SmartRhythmsTheme";
import { SmartRhythmsProvider } from "./SmartRhythmsContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RhythmSet = {
  id: string;
  set_name: string;
  description: string | null;
  price: number;
  creator_name: string;
  brand_id: string;
  youtube_video_id: string | null;
  cover_image_url: string | null;
};
type Folder = { id: string; set_id: string; name: string; sort_order: number };
type Item = { id: string; folder_id: string; name: string; description: string | null; sort_order: number };
type Sample = { id: string; rhythm_item_id: string | null; button_type: string; audio_url: string };

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

function extractYouTubeId(input: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function ProductPageVirtualOrgan({ setId }: { setId: string }) {
  return (
    <SmartRhythmsProvider>
      <Inner setId={setId} />
    </SmartRhythmsProvider>
  );
}

function Inner({ setId }: { setId: string }) {
  const { selectedModel } = useSmartRhythms();
  const [set, setSet] = useState<RhythmSet | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("rhythm_sets").select("*").eq("id", setId).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSet(s as any);
      const { data: f } = await supabase.from("rhythm_folders").select("*").eq("set_id", setId).order("sort_order");
      setFolders((f ?? []) as any);
      const folderIds = (f ?? []).map((x: any) => x.id);
      let its: Item[] = [];
      if (folderIds.length) {
        const { data: i } = await supabase.from("rhythm_items").select("*").in("folder_id", folderIds).order("sort_order");
        its = (i ?? []) as any;
        setItems(its);
      }
      const itemIds = its.map((i) => i.id);
      if (itemIds.length) {
        const { data: smp } = await supabase.from("set_audio_samples").select("*").in("rhythm_item_id", itemIds);
        setSamples((smp ?? []) as any);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user && itemIds.length) {
        const { data: favs } = await supabase.from("rhythm_item_favorites").select("rhythm_item_id").eq("user_id", user.id).in("rhythm_item_id", itemIds);
        setFavorites(new Set((favs ?? []).map((x: any) => x.rhythm_item_id)));
      }
      setLoading(false);
    })();
  }, [setId]);

  const ytId = useMemo(() => extractYouTubeId(set?.youtube_video_id ?? null), [set]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!set) {
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">הסט לא נמצא.</div>;
  }

  return (
    <div className="pb-32">
      {/* Intro Section */}
      <section className="border-b border-border/40 bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Smart Rhythms · {set.creator_name}</p>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{set.set_name}</h1>
            {set.description && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{set.description}</p>}
          </div>

          {ytId && (
            <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                  title={`${set.set_name} — Promo`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          )}

          {!selectedModel && (
            <div className="mt-10">
              <KeyboardModelSelector />
            </div>
          )}
        </div>
      </section>

      {/* Virtual Organ */}
      {selectedModel && (
        <VirtualOrgan
          set={set}
          folders={folders}
          items={items}
          samples={samples}
          favorites={favorites}
          setFavorites={setFavorites}
        />
      )}

      {/* Sticky cart bar */}
      <StickyCart set={set} />
    </div>
  );
}

function VirtualOrgan({
  set, folders, items, samples, favorites, setFavorites,
}: {
  set: RhythmSet;
  folders: Folder[];
  items: Item[];
  samples: Sample[];
  favorites: Set<string>;
  setFavorites: (s: Set<string>) => void;
}) {
  const { selectedModel } = useSmartRhythms();
  const { user } = useAuth();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const folderItems = useMemo(
    () => items.filter((i) => i.folder_id === activeFolderId),
    [items, activeFolderId]
  );

  const sampleMap = useMemo(() => {
    const m = new Map<string, string>();
    samples.filter((s) => s.rhythm_item_id === activeItemId).forEach((s) => m.set(s.button_type, s.audio_url));
    return m;
  }, [samples, activeItemId]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setActiveBtn(null);
  };

  const playSample = (btn: ButtonDef) => {
    if (!activeItemId) {
      toast.info("בחר מקצב מתוך התיקייה");
      return;
    }
    if (activeBtn === btn.code) { stop(); return; }
    const url = sampleMap.get(btn.code);
    if (!url) { toast.info(`אין דגימה ל-${btn.label}`); return; }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.loop = true; // continuous loop
    audioRef.current.play().catch(() => toast.error("שגיאה בהשמעה"));
    setActiveBtn(btn.code);
  };

  useEffect(() => () => stop(), []);
  useEffect(() => { stop(); }, [activeItemId]);

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

  const renderRow = (defs: ButtonDef[], label: string) => (
    <div className="flex flex-col gap-2">
      <SrLabel>{label}</SrLabel>
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
              disabled={!activeItemId}
              onClick={() => playSample(b)}
              className="text-[0.7rem] sm:text-xs px-2 py-3"
              style={{ opacity: !activeItemId ? 0.4 : has ? 1 : 0.55 }}
            >
              {b.label}
            </SrKey>
          );
        })}
      </div>
    </div>
  );

  return (
    <SmartRhythmsTheme dir="rtl" className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SrLabel>Selected Keyboard</SrLabel>
            <div className="text-lg font-semibold">{selectedModel?.brand?.name} · {selectedModel?.model_name}</div>
          </div>
          <SrChip>
            <span className="sr-led-dot" style={{ background: "var(--sr-led-green)", boxShadow: "0 0 6px var(--sr-led-green)" }} />
            POWER ON
          </SrChip>
        </div>

        {/* LCD Screen */}
        <SrPanel className="!p-3 sm:!p-4">
          <div
            className="rounded-lg p-4 sm:p-6 min-h-[320px]"
            style={{
              background: "linear-gradient(180deg, oklch(0.22 0.07 230) 0%, oklch(0.14 0.06 235) 100%)",
              boxShadow: "inset 0 2px 12px oklch(0 0 0 / 0.7), inset 0 -1px 0 oklch(1 0 0 / 0.05), 0 0 0 1px oklch(0 0 0 / 0.6)",
              border: "1px solid oklch(0 0 0 / 0.7)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <SrReadout className="!py-1 !px-3 text-xs">{set.set_name.toUpperCase()}</SrReadout>
              <div className="text-xs sr-mono" style={{ color: "var(--sr-led-blue)" }}>
                {folders.length.toString().padStart(3, "0")} FOLDERS
              </div>
            </div>

            {!activeFolderId ? (
              folders.length === 0 ? (
                <div className="flex h-44 items-center justify-center sr-mono text-sm" style={{ color: "var(--sr-led-blue)" }}>
                  NO FOLDERS YET
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {folders.map((f) => (
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
                      <Folder className="h-4 w-4" />
                      <span className="sr-mono text-xs">{f.name}</span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => { setActiveFolderId(null); setActiveItemId(null); }}
                  className="mb-3 inline-flex items-center gap-1 text-xs sr-mono hover:underline"
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
                            <Heart
                              className={cn("h-4 w-4 transition", fav ? "fill-red-500 text-red-500" : "text-muted-foreground")}
                            />
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

        {/* Hardware buttons */}
        <SrPanel>
          <div className="grid gap-4 md:grid-cols-4">
            {renderRow(INTROS, "INTRO")}
            {renderRow(MAINS, "MAIN VARIATION")}
            {renderRow(FILLS, "FILL IN")}
            {renderRow(ENDINGS, "ENDING")}
          </div>
          <div className="mt-4 flex justify-center">
            <SrKey led="red" onClick={stop} disabled={!activeBtn} className="!min-h-[2.6rem] !px-6">
              <Square className="h-4 w-4" /> STOP
            </SrKey>
          </div>
        </SrPanel>
      </div>
    </SmartRhythmsTheme>
  );
}

function StickyCart({ set }: { set: RhythmSet }) {
  const { add } = useCart();
  const handle = () => {
    add({
      id: `rhythm:${set.id}`,
      slug: set.id,
      title: set.set_name,
      price: Number(set.price) || 0,
      image: set.cover_image_url,
      product_type: "rhythm_set",
    });
    toast.success(`${set.set_name} נוסף לעגלה`);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div>
          <div className="text-xs text-muted-foreground">{set.creator_name} · {set.set_name}</div>
          <div className="text-2xl font-bold">₪{Number(set.price).toLocaleString()}</div>
        </div>
        <Button size="lg" onClick={handle} className="gap-2">
          <ShoppingCart className="h-5 w-5" />
          הוסף לעגלה
        </Button>
      </div>
    </div>
  );
}
