import { createFileRoute } from "@tanstack/react-router";
import { UsersManager } from "@/components/admin/UsersManager";

export const Route = createFileRoute("/admin/users")({
  component: () => <UsersManager />,
});
