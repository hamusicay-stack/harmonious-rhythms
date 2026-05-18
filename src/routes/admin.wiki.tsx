import { createFileRoute } from "@tanstack/react-router";
import { WikiManager } from "@/components/admin/WikiManager";

export const Route = createFileRoute("/admin/wiki")({
  component: () => <WikiManager />,
});
