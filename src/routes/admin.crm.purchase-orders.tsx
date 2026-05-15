import { createFileRoute } from "@tanstack/react-router";
import { SupplierOrdersManager } from "@/components/admin/SupplierOrdersManager";

export const Route = createFileRoute("/admin/crm/purchase-orders")({
  component: () => <SupplierOrdersManager />,
});
