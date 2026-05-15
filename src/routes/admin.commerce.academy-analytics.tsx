import { createFileRoute } from "@tanstack/react-router";
import { AcademyAnalytics } from "@/components/admin/AcademyAnalytics";

export const Route = createFileRoute("/admin/commerce/academy-analytics")({
  component: () => <AcademyAnalytics />,
});
