import { createFileRoute } from "@tanstack/react-router";
import { OrganUIThemeEditor } from "@/components/admin/OrganUIThemeEditor";

export const Route = createFileRoute("/admin/commerce/organ-ui")({
  component: () => <OrganUIThemeEditor />,
});
