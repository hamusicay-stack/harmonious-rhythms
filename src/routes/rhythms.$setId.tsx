import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductPageVirtualOrgan } from "@/components/rhythm/ProductPageVirtualOrgan";

export const Route = createFileRoute("/rhythms/$setId")({
  head: () => ({
    meta: [
      { title: "סט מקצבים — Smart Rhythms" },
      { name: "description", content: "צפה בסט המקצבים, בחר את הקליד שלך והאזן לדגימות באורגן וירטואלי לפני הרכישה." },
    ],
  }),
  component: ProductRoute,
});

function ProductRoute() {
  const { setId } = Route.useParams();
  return (
    <SiteLayout>
      <ProductPageVirtualOrgan setId={setId} />
    </SiteLayout>
  );
}
