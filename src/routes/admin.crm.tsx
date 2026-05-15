import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/crm")({
  component: () => <Outlet />,
});
