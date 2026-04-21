import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "חנות — המוזיקאי" },
      { name: "description", content: "מקצבים, סאמפלים, פלאגינים וציוד מקצועי בחנות אחת." },
      { property: "og:title", content: "חנות — המוזיקאי" },
      { property: "og:description", content: "מקצבים, סאמפלים, פלאגינים וציוד מקצועי בחנות אחת." },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  return (
    <ModulePlaceholder icon={ShoppingBag} title="החנות" subtitle="כלים, סאמפלים ופלאגינים — נבחרים בקפידה.">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card-elevated p-6">
            <div className="mb-4 aspect-square rounded-xl bg-gradient-to-br from-primary/20 to-accent/20" />
            <h3 className="font-semibold">מוצר לדוגמה {i + 1}</h3>
            <p className="text-sm text-muted-foreground">תיאור קצר על המוצר</p>
            <div className="mt-3 text-primary font-bold">₪149</div>
          </div>
        ))}
      </div>
    </ModulePlaceholder>
  );
}
