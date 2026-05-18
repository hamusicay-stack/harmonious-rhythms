import { createFileRoute } from "@tanstack/react-router";
import { ShopOrderDetail } from "@/components/admin/ShopOrderDetail";

export const Route = createFileRoute("/admin/commerce/orders/$orderId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { orderId } = Route.useParams();
  return <ShopOrderDetail orderId={orderId} />;
}
