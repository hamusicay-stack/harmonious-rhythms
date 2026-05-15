import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { BeatSetProductPage } from "@/components/rhythm/BeatSetProductPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/beat/$setId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("rhythm_sets")
      .select("set_name, description, cover_image_url, creator_name, price")
      .eq("id", params.setId)
      .maybeSingle();
    return { meta: data };
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const title = (m?.set_name || "סט BEAT") + " — האזן וקנה";
    const desc =
      (m?.description ? String(m.description).slice(0, 155) : null) ||
      `סט קצבים${m?.creator_name ? ` מאת ${m.creator_name}` : ""} — האזן לרצועות מלאות וקנה ישירות.`;
    const url = `https://harmonious-rhythms.lovable.app/beat/${params.setId}`;
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
    ];
    if (m?.cover_image_url) {
      meta.push({ property: "og:image", content: m.cover_image_url });
      meta.push({ name: "twitter:image", content: m.cover_image_url });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
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
