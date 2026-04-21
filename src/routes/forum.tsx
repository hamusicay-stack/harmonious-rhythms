import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Music, Mic, Settings2, Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "פורום — המוזיקאי" },
      { name: "description", content: "דיונים מקצועיים, שאלות ושיתוף ידע בקהילת המוזיקאים." },
      { property: "og:title", content: "פורום — המוזיקאי" },
      { property: "og:description", content: "דיונים מקצועיים, שאלות ושיתוף ידע בקהילת המוזיקאים." },
    ],
  }),
  component: ForumPage,
});

const categories = [
  { icon: Music, title: "הפקה מוזיקלית", count: 142 },
  { icon: Mic, title: "ווקאל וביצוע", count: 87 },
  { icon: Settings2, title: "ציוד וטכנולוגיה", count: 213 },
  { icon: Users, title: "קריירה ועסקים", count: 64 },
];

function ForumPage() {
  return (
    <ModulePlaceholder
      icon={MessageSquare}
      title="הפורום"
      subtitle="לב הקהילה — שאלו, השיבו, השפיעו."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((c) => (
          <div key={c.title} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card-elevated p-6 transition-smooth hover:border-primary/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.count} דיונים פעילים</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModulePlaceholder>
  );
}
