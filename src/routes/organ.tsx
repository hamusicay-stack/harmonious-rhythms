import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { KeyboardModelSelector } from "@/components/rhythm/KeyboardModelSelector";
import { VisualOrganInterface } from "@/components/rhythm/VisualOrganInterface";
import { useKeyboardSelection } from "@/contexts/KeyboardSelectionContext";

export const Route = createFileRoute("/organ")({
  validateSearch: (s: Record<string, unknown>) => ({
    set: typeof s.set === "string" ? s.set : undefined,
    model: typeof s.model === "string" ? s.model : undefined,
  }),
  head: () => ({
    meta: [
      { title: "אורגן וירטואלי — נגן, בחר וקנה סטים | המוזיקאי" },
      {
        name: "description",
        content:
          "חוויית נגינה מלאה באורגן וירטואלי — בחר את הקליד שלך (Tyros, Genos, Korg Pa ועוד), נגן Intro/Main/Fill/Ending והקשב לדגמיות בזמן אמת.",
      },
      { property: "og:title", content: "אורגן וירטואלי — המוזיקאי" },
      {
        property: "og:description",
        content: "נגן על אורגן וירטואלי בפריסה אותנטית של הקליד שלך, האזן לסטים שלמים והוסף לסל.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OrganRoute,
});

function OrganRoute() {
  const { set } = Route.useSearch();
  return (
    <SiteLayout>
      <OrganShell presetSetId={set} />
    </SiteLayout>
  );
}

function OrganShell({ presetSetId }: { presetSetId?: string }) {
  const { selectedModel, setSelectedModel } = useKeyboardSelection();
  if (!selectedModel) {
    return <KeyboardModelSelector />;
  }
  return (
    <VisualOrganInterface
      presetSetId={presetSetId}
      onBack={() => setSelectedModel(null)}
    />
  );
}
