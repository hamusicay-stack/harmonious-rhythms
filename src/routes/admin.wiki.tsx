import { createFileRoute } from "@tanstack/react-router";
import { WikiGenerator } from "@/components/admin/WikiGenerator";

export const Route = createFileRoute("/admin/wiki")({
  component: () => <WikiGenerator />,
});
