import { createFileRoute } from "@tanstack/react-router";
import { RhythmSetsManager } from "@/components/admin/RhythmSetsManager";

export const Route = createFileRoute("/admin/commerce/beat")({
  component: () => <RhythmSetsManager />,
});
