import { createFileRoute } from "@tanstack/react-router";
import { ForumManager } from "@/components/admin/ForumManager";

export const Route = createFileRoute("/admin/forum")({
  component: () => <ForumManager />,
});
