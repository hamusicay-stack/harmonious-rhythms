import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { MarketplaceSettings } from "@/components/admin/MarketplaceSettings";
import { MarketplaceCategoriesManager } from "@/components/admin/MarketplaceCategoriesManager";
import { BusinessSellersManager } from "@/components/admin/BusinessSellersManager";
import { MarketplaceManager } from "@/components/admin/MarketplaceManager";
import { ReportsManager } from "@/components/admin/ReportsManager";

export const Route = createFileRoute("/admin/commerce/marketplace")({
  component: MarketplaceRoute,
});

function MarketplaceRoute() {
  return (
    <div className="space-y-6">
      <MarketplaceSettings />
      <MarketplaceCategoriesManager />
      <BusinessSellersManager />
      <MarketplaceManager />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />דיווחי משתמשים
          </CardTitle>
        </CardHeader>
        <CardContent><ReportsManager /></CardContent>
      </Card>
    </div>
  );
}
