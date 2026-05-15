import { createFileRoute } from "@tanstack/react-router";
import { AffiliatePayoutsManager } from "@/components/admin/AffiliatePayoutsManager";
import { AffiliatesManager } from "@/components/admin/AffiliatesManager";

export const Route = createFileRoute("/admin/commerce/affiliates")({
  component: () => (
    <div className="space-y-6">
      <AffiliatePayoutsManager />
      <AffiliatesManager />
    </div>
  ),
});
