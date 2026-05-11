import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Music2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/beat/")({
  head: () => ({
    meta: [
      { title: "BEAT — חנות סטים" },
      { name: "description", content: "גלה סטי BEAT — האזן לרצועות שלמות, צפה במחיר ורכוש." },
      { property: "og:title", content: "BEAT — חנות סטים" },
      { property: "og:description", content: "גלה סטי BEAT — האזן לרצועות שלמות, צפה במחיר ורכוש." },
    ],
  }),
  component: BeatIndexPage,
});

type RhythmSet = {
  id: string;
  set_name: string;
  description: string | null;
  price: number;
  creator_name: string;
  cover_image_url: string | null;
};

function BeatIndexPage() {
  const [sets, setSets] = useState<RhythmSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("rhythm_sets")
        .select("id,set_name,description,price,creator_name,cover_image_url")
        .order("created_at", { ascending: false });
      setSets((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10 md:px-8">
        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">חנות</p>
          <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">BEAT</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            סטים של מקצבים מקצועיים — האזן לרצועות שלמות, צפה במחיר וקנה.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sets.length === 0 ? (
          <p className="text-center text-muted-foreground">אין סטים זמינים כרגע.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sets.map((s) => (
              <Link
                key={s.id}
                to="/beat/$setId"
                params={{ setId: s.id }}
                className="group overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/60 hover:shadow-lg"
              >
                <div className="aspect-square bg-muted">
                  {s.cover_image_url ? (
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
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
