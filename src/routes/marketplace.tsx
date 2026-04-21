import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace")({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  return <Outlet />;
}
