import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "אודות — המוזיקאי" },
      { name: "description", content: "המשימה שלנו: לבנות בית לכל מוזיקאי — מקצועי, יוקרתי וקהילתי." },
      { property: "og:title", content: "אודות — המוזיקאי" },
      { property: "og:description", content: "המשימה שלנו: לבנות בית לכל מוזיקאי — מקצועי, יוקרתי וקהילתי." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <ModulePlaceholder icon={Sparkles} title="אודות המוזיקאי" subtitle="המקום שבו מוזיקאים פוגשים מוזיקאים.">
      <div className="prose prose-invert mx-auto max-w-2xl text-muted-foreground">
        <p className="text-lg leading-relaxed">
          המוזיקאי הוא הפלטפורמה המובילה בישראל למוזיקאים, מפיקים, מורים ותלמידים.
          המשימה שלנו היא לרכז במקום אחד את כל מה שמוזיקאי צריך — דיונים מקצועיים,
          מוצרים נבחרים, קורסים איכותיים ושוק יד-שנייה הוגן.
        </p>
        <p className="mt-6 leading-relaxed">
          אנחנו מאמינים בעיצוב מוקפד, חוויה נקייה וקהילה אמיתית. בלי רעש, בלי פרסומות,
          בלי פשרות — רק מוזיקה ואנשים שאוהבים אותה.
        </p>
      </div>
    </ModulePlaceholder>
  );
}
