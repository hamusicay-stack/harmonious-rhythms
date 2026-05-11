import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Music2, LayoutGrid, Piano } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { resolveVideoEmbed } from "@/lib/videoSource";
import { SmartRhythmsProvider, useSmartRhythms } from "@/components/rhythm/SmartRhythmsContext";
import { KeyboardModelSelector } from "@/components/rhythm/KeyboardModelSelector";
import { VisualOrganInterface } from "@/components/rhythm/VisualOrganInterface";

export const Route = createFileRoute("/beat/")({
  head: () => ({
    meta: [
      { title: "BEAT — חנות סטים" },
      { name: "description", content: "גלה סטי BEAT — האזן לרצועות שלמות, צפה במחיר ורכוש." },
      { property: "og:title", content: "BEAT — חנות סטים" },
      { property: "og:description", content: "גלה סטי BEAT — האזן לרצועות שלמות, צפה במחיר ורכוש." },
    ],
  }),
  component: BeatIndexRoute,
});

type RhythmSet = {
  id: string;
  set_name: string;
  description: string | null;
  price: number;
  creator_name: string;
  cover_image_url: string | null;
  youtube_video_id: string | null;
  video_source_type: string | null;
  video_url: string | null;
};

function BeatIndexRoute() {
  return (
    <SmartRhythmsProvider>
      <BeatIndexPage />
    </SmartRhythmsProvider>
  );
}

function BeatIndexPage() {
  const [view, setView] = useState<"catalog" | "organ">("catalog");
  const { selectedModel, setSelectedModel } = useSmartRhythms();
  const [organStage, setOrganStage] = useState<"pick" | "play">("pick");

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">חנות</p>
          <h1 className="mt-1 font-display text-4xl font-bold md:text-5xl">BEAT</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            סטים של מקצבים מקצועיים — בחר תצוגה שמתאימה לך
          </p>
        </header>

        {/* View Switcher */}
        <div className="mx-auto mb-8 flex max-w-md items-center justify-center gap-2 rounded-full border border-border/60 bg-card p-1">
          <Button
            variant={view === "catalog" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-full gap-2"
            onClick={() => setView("catalog")}
          >
            <LayoutGrid className="h-4 w-4" />
            סיור לפי סטים
          </Button>
          <Button
            variant={view === "organ" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-full gap-2"
            onClick={() => { setView("organ"); setOrganStage("pick"); }}
          >
            <Piano className="h-4 w-4" />
            סיור באורגן הוויזואלי
          </Button>
        </div>

        {view === "catalog" ? (
          <CatalogView />
        ) : organStage === "pick" || !selectedModel ? (
          <KeyboardModelSelector onSelected={() => setOrganStage("play")} className="!p-0" />
        ) : (
          <VisualOrganInterface
            onBack={() => { setSelectedModel(null); setOrganStage("pick"); }}
          />
        )}
      </div>
    </SiteLayout>
  );
}

function CatalogView() {
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rhythm_sets")
        .select("id,set_name,description,price,creator_name,cover_image_url,youtube_video_id,video_source_type,video_url")
        .order("created_at", { ascending: false });
      setSets((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (sets.length === 0) {
    return <p className="text-center text-muted-foreground">אין סטים זמינים כרגע.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sets.map((s) => {
        const video = resolveVideoEmbed(s.video_source_type, s.video_url, s.youtube_video_id);
        return (
          <Link
            key={s.id}
            to="/beat/$setId"
            params={{ setId: s.id }}
            className="group overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/60 hover:shadow-lg"
          >
            <div className="aspect-video bg-muted">
              {video ? (
                video.kind === "iframe" ? (
                  <iframe src={video.src} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
                ) : (
                  <video src={video.src} className="h-full w-full object-cover" muted loop playsInline preload="metadata" />
                )
              ) : s.cover_image_url ? (
                <img src={s.cover_image_url} alt={s.set_name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Music2 className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">{s.creator_name}</div>
              <div className="mt-0.5 truncate font-semibold">{s.set_name}</div>
              <div className="mt-1 text-lg font-bold">₪{Number(s.price).toLocaleString()}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
