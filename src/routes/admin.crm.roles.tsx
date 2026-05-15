import { createFileRoute } from "@tanstack/react-router";
import { RolesPermissionsManager } from "@/components/admin/RolesPermissionsManager";

export const Route = createFileRoute("/admin/crm/roles")({
  component: () => <RolesPermissionsManager />,
});
