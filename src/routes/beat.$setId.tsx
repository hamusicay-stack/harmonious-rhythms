import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { BeatSetProductPage } from "@/components/rhythm/BeatSetProductPage";

export const Route = createFileRoute("/beat/$setId")({
  head: () => ({
    meta: [
      { title: "סט BEAT — האזן וקנה" },
      { name: "description", content: "צפה בסט, האזן לרצועות מלאות וקנה ישירות." },
      { property: "og:title", content: "סט BEAT — האזן וקנה" },
      { property: "og:description", content: "צפה בסט, האזן לרצועות מלאות וקנה ישירות." },
    ],
  }),
  component: BeatProductRoute,
});

function BeatProductRoute() {
  const { setId } = Route.useParams();
  return (
    <SiteLayout>
      <BeatSetProductPage setId={setId} />
    </SiteLayout>
  );
}
