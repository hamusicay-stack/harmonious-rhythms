import { createFileRoute } from "@tanstack/react-router";
import { AcademyManager } from "@/components/admin/AcademyManager";

export const Route = createFileRoute("/admin/commerce/academy")({
  component: () => <AcademyManager />,
});
