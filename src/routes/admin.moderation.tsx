import { createFileRoute } from "@tanstack/react-router";
import { ModerationHub } from "@/components/admin/ModerationHub";

export const Route = createFileRoute("/admin/moderation")({
  component: () => <ModerationHub />,
});
