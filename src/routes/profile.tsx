import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "הפרופיל שלי — המוזיקאי" },
      { name: "description", content: "ניהול הפרופיל, הפעילות וההזמנות." },
      { property: "og:title", content: "הפרופיל שלי — המוזיקאי" },
      { property: "og:description", content: "ניהול הפרופיל, הפעילות וההזמנות." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <ModulePlaceholder icon={User} title="הפרופיל שלי" subtitle="הפעילות, ההזמנות וההגדרות שלכם.">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card-elevated p-8 text-center text-muted-foreground">
        התחברו כדי לראות את הפרופיל שלכם.
      </div>
    </ModulePlaceholder>
  );
}
