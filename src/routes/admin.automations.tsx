import { createFileRoute } from "@tanstack/react-router";
import { AutomationsManager } from "@/components/admin/AutomationsManager";

export const Route = createFileRoute("/admin/automations")({
  component: () => <AutomationsManager />,
});
