import { createFileRoute } from "@tanstack/react-router";
import { ShopManager } from "@/components/admin/ShopManager";

export const Route = createFileRoute("/admin/commerce/shop")({
  component: () => <ShopManager />,
});
