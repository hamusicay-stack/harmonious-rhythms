import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Loader2, ArrowRight } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ListingFormWizard, type ListingInitial } from "@/components/marketplace/ListingFormWizard";

export const Route = createFileRoute("/marketplace/$listingId/edit")({
  head: () => ({ meta: [{ title: "עריכת מודעה — המוזיקאי" }] }),
  component: EditListingPage,
});

function EditListingPage() {
  const { listingId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<ListingInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("id, seller_id, seller_type, title, description, category, custom_category, subcategory, custom_subcategory, brand, custom_brand, model, item_condition, price, city, phone, whatsapp, images, video_url, audio_url, is_urgent, specs, status")
        .eq("id", listingId)
        .maybeSingle();
      if (error || !data) { setLoading(false); return; }
      if (data.seller_id !== user.id) { setForbidden(true); setLoading(false); return; }
      setListing(data as ListingInitial);
      setLoading(false);
    })();
  }, [listingId, user, authLoading]);

  if (authLoading || loading) {
    return <ModulePlaceholder icon={Loader2} title="טוען..." subtitle="" />;
  }
  if (!user) {
    return (
      <ModulePlaceholder icon={Pencil} title="עריכת מודעה" subtitle="יש להתחבר">
        <Link to="/auth"><Button>התחבר</Button></Link>
      </ModulePlaceholder>
    );
  }
  if (forbidden) {
    return (
      <ModulePlaceholder icon={ArrowRight} title="אין הרשאה" subtitle="רק בעל המודעה יכול לערוך אותה">
        <Link to="/marketplace/$listingId" params={{ listingId }}><Button>חזרה למודעה</Button></Link>
      </ModulePlaceholder>
    );
  }
  if (!listing) {
    return (
      <ModulePlaceholder icon={ArrowRight} title="המודעה לא נמצאה" subtitle="">
        <Link to="/marketplace"><Button>חזרה ללוח</Button></Link>
      </ModulePlaceholder>
    );
  }

  return (
    <ModulePlaceholder icon={Pencil} title="עריכת מודעה" subtitle={listing.title ?? ""}>
      <ListingFormWizard mode="edit" initial={listing} />
    </ModulePlaceholder>
  );
}
