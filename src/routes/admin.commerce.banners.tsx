import { createFileRoute } from "@tanstack/react-router";
import { BannersManager } from "@/components/admin/BannersManager";

export const Route = createFileRoute("/admin/commerce/banners")({
  component: () => <BannersManager />,
});
