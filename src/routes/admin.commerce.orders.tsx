import { createFileRoute } from "@tanstack/react-router";
import { AdminOrderManager } from "@/components/admin/AdminOrderManager";

export const Route = createFileRoute("/admin/commerce/orders")({
  component: () => <AdminOrderManager />,
});
