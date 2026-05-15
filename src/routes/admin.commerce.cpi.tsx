import { createFileRoute } from "@tanstack/react-router";
import { CpiAutomationSettings } from "@/components/admin/CpiAutomationSettings";

export const Route = createFileRoute("/admin/commerce/cpi")({
  component: () => <CpiAutomationSettings />,
});
