import { createFileRoute } from "@tanstack/react-router";
import { NewsletterManager } from "@/components/admin/NewsletterManager";

export const Route = createFileRoute("/admin/commerce/newsletter")({
  component: () => <NewsletterManager />,
});
