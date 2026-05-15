import { createFileRoute } from "@tanstack/react-router";
import { ShortsManager } from "@/components/admin/ShortsManager";

export const Route = createFileRoute("/admin/commerce/shorts")({
  component: () => <ShortsManager />,
});
