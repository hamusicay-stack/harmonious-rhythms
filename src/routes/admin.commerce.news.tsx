import { createFileRoute } from "@tanstack/react-router";
import { NewsManager } from "@/components/admin/NewsManager";

export const Route = createFileRoute("/admin/commerce/news")({
  component: () => <NewsManager />,
});
