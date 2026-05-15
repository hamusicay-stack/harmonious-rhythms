import { createFileRoute } from "@tanstack/react-router";
import { ChatOversightViewer } from "@/components/admin/ChatOversightViewer";

export const Route = createFileRoute("/admin/chat-oversight")({
  component: () => <ChatOversightViewer />,
});
