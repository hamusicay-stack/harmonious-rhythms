import { useEffect, useMemo, useState } from "react";
import { Loader2, ShoppingCart, Music2, Folder as FolderIcon, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { normalizeAudioUrl } from "@/lib/audioUrl";
import { resolveVideoEmbed } from "@/lib/videoSource";

type RhythmSet = {
  id: string;
  set_name: string;
  description: string | null;
  price: number;
  creator_name: string;
  brand_id: string;
  youtube_video_id: string | null;
  cover_image_url: string | null;
  video_source_type: string | null;
  video_url: string | null;
};
type Folder = { id: string; set_id: string; name: string; sort_order: number };
type Item = { id: string; folder_id: string; name: string; description: string | null; sort_order: number };
type Sample = { id: string; rhythm_item_id: string | null; button_type: string; audio_url: string };

export function BeatSetProductPage({ setId }: { setId: string }) {
  const [set, setSet] = useState<RhythmSet | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

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
        const { data: smp } = await supabase.from("set_audio_samples" as any).select("*").in("rhythm_item_id", itemIds);
        setSamples((smp ?? []) as any);
      }
      setLoading(false);
    })();
  }, [setId]);

  const video = useMemo(
    () => set ? resolveVideoEmbed(set.video_source_type, set.video_url, set.youtube_video_id) : null,
    [set],
  );

  const samplesByItem = useMemo(() => {
    const m = new Map<string, Sample[]>();
    samples.forEach((s) => {
      if (!s.rhythm_item_id) return;
      const list = m.get(s.rhythm_item_id) ?? [];
      list.push(s);
      m.set(s.rhythm_item_id, list);
    });
    return m;
  }, [samples]);

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

  const handleAdd = () => {
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
    <div className="pb-32">
      <section className="border-b border-border/40 bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
          <Link to="/beat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> חזרה ל-BEAT
          </Link>

          <div className="mt-6 grid gap-8 md:grid-cols-[300px,1fr]">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-lg">
              {set.cover_image_url ? (
                <img src={set.cover_image_url} alt={set.set_name} className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-muted-foreground">
                  <Music2 className="h-20 w-20" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">BEAT · {set.creator_name}</p>
              <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{set.set_name}</h1>
              {set.description && <p className="mt-4 text-muted-foreground">{set.description}</p>}
              <div className="mt-6 flex items-center gap-4">
                <div className="text-3xl font-bold">₪{Number(set.price).toLocaleString()}</div>
                <Button size="lg" onClick={handleAdd} className="gap-2">
                  <ShoppingCart className="h-5 w-5" /> הוסף לעגלה
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                {folders.length} תיקיות · {items.length} מקצבים · {samples.length} דגימות
              </div>
            </div>
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
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 md:px-8">
        <h2 className="mb-6 font-display text-2xl font-bold">רשימת הרצועות</h2>

        {folders.length === 0 && (
          <p className="text-muted-foreground">אין עדיין רצועות בסט זה.</p>
        )}

        <div className="space-y-8">
          {folders.map((folder) => {
            const folderItems = items.filter((i) => i.folder_id === folder.id);
            if (!folderItems.length) return null;
            return (
              <div key={folder.id} className="rounded-xl border border-border/60 bg-card/40 p-4 md:p-6">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <FolderIcon className="h-5 w-5 text-primary" />
                  {folder.name}
                </div>
                <div className="space-y-3">
                  {folderItems.map((it) => {
                    const itemSamples = samplesByItem.get(it.id) ?? [];
                    return (
                      <div key={it.id} className="rounded-lg border border-border/40 bg-background/60 p-3">
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <div className="font-medium">{it.name}</div>
                            {it.description && (
                              <div className="text-xs text-muted-foreground">{it.description}</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {itemSamples.length} דגימות
                          </div>
                        </div>
                        {itemSamples.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {itemSamples.map((smp) => (
                              <div key={smp.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1">
                                <span className="min-w-[70px] text-xs font-mono text-muted-foreground">{smp.button_type}</span>
                                <audio
                                  controls
                                  preload="none"
                                  src={normalizeAudioUrl(smp.audio_url)}
                                  className="h-8 flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sticky cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div>
            <div className="text-xs text-muted-foreground">{set.creator_name} · {set.set_name}</div>
            <div className="text-2xl font-bold">₪{Number(set.price).toLocaleString()}</div>
          </div>
          <Button size="lg" onClick={handleAdd} className="gap-2">
            <ShoppingCart className="h-5 w-5" /> הוסף לעגלה
          </Button>
        </div>
      </div>
    </div>
  );
}
