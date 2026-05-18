import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/yt-shorts")({
  head: () => ({
    meta: [
      { title: "שורטס מוזיקלי — סרטונים קצרים מובחרים | המוזיקאי" },
      { name: "description", content: "פיד שורטס מוזיקלי אוצרני: הסרטונים החמים ביותר מערוצי יוטיוב מובילים, בהתאמה לעברית." },
    ],
  }),
  component: YtShortsPage,
});

type AiShort = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  channel_name: string | null;
  created_at: string;
};

function YtShortsPage() {
  const [items, setItems] = useState<AiShort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("musician_shorts")
        .select("id,youtube_video_id,title,description,channel_name,created_at")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(60);
      setItems((data ?? []) as AiShort[]);
      setLoading(false);
    })();
  }, []);

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-background via-background to-amber-950/10 min-h-[calc(100vh-200px)]">
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-amber-400" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-amber-300 via-amber-400 to-yellow-200">
              שורטס מוזיקלי
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            פיד אוצרני של שורטס מוזיקליים מהיוטיוב — סקירות ציוד, טיפים, וטרנדים, בהתאמה אישית בעברית.
          </p>
        </section>

        <section className="container mx-auto px-4 pb-16">
          {loading ? (
            <div className="text-center text-muted-foreground py-16">טוען...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 border border-dashed border-amber-500/20 rounded-2xl">
              עדיין אין שורטס מאושרים. בקרוב.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((s) => (
                <article
                  key={s.id}
                  className="group rounded-2xl border border-amber-500/20 bg-card overflow-hidden hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition"
                >
                  <div className="aspect-[9/16] bg-black relative">
                    <iframe
                      src={`https://www.youtube.com/embed/${s.youtube_video_id}?rel=0&modestbranding=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={s.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <h2 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-amber-300 transition">
                      {s.title}
                    </h2>
                    {s.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {s.description}
                      </p>
                    )}
                    {s.channel_name && (
                      <div className="flex items-center gap-2 pt-1">
                        <Youtube className="h-3.5 w-3.5 text-red-500" />
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-xs">
                          {s.channel_name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
