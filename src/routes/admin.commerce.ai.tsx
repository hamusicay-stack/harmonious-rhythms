import { createFileRoute } from "@tanstack/react-router";
import { AiPromptsManager } from "@/components/admin/AiPromptsManager";

export const Route = createFileRoute("/admin/commerce/ai")({
  component: () => <AiPromptsManager />,
});
