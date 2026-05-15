import { createFileRoute } from "@tanstack/react-router";
import { AdminsManager } from "@/components/admin/_legacy/AdminsManager";

export const Route = createFileRoute("/admin/crm/admins")({
  component: () => <AdminsManager />,
});
