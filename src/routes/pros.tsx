import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/pros")({
  component: ProsLayout,
});

function ProsLayout() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  );
}
