import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "יד שנייה — המוזיקאי" },
      { name: "description", content: "כלי נגינה וציוד הקלטה משומשים מקהילת המוזיקאים." },
      { property: "og:title", content: "יד שנייה — המוזיקאי" },
      { property: "og:description", content: "כלי נגינה וציוד הקלטה משומשים מקהילת המוזיקאים." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <ModulePlaceholder icon={Tags} title="יד שנייה" subtitle="קונים, מוכרים ומחליפים — בתוך הקהילה.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card-elevated p-5">
            <div className="mb-3 aspect-square rounded-xl bg-gradient-to-br from-secondary to-muted" />
            <h3 className="text-sm font-semibold">מודעה {i + 1}</h3>
            <div className="mt-2 text-primary font-bold">₪{(i + 1) * 250}</div>
          </div>
        ))}
      </div>
    </ModulePlaceholder>
  );
}
