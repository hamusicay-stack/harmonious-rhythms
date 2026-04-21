import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "אקדמיה — המוזיקאי" },
      { name: "description", content: "קורסים, שיעורים ומאסטרקלאסים מהמובילים בתחום." },
      { property: "og:title", content: "אקדמיה — המוזיקאי" },
      { property: "og:description", content: "קורסים, שיעורים ומאסטרקלאסים מהמובילים בתחום." },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  return (
    <ModulePlaceholder icon={GraduationCap} title="האקדמיה" subtitle="ללמוד, להתפתח, להתמקצע — עם הטובים ביותר.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {["מבוא להפקה", "מיקס ומאסטרינג", "קומפוזיציה", "סינתזה", "תיאוריה מוזיקלית", "סאונד דיזיין"].map((title) => (
          <div key={title} className="rounded-2xl border border-border/60 bg-card-elevated p-6 transition-smooth hover:border-primary/40">
            <div className="mb-4 aspect-video rounded-xl bg-gradient-to-br from-accent/30 to-primary/20" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">12 שיעורים · 4.5 שעות</p>
          </div>
        ))}
      </div>
    </ModulePlaceholder>
  );
}
