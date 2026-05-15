import { createFileRoute } from "@tanstack/react-router";
import { MusicProsManager } from "@/components/admin/MusicProsManager";

export const Route = createFileRoute("/admin/commerce/music-pros")({
  component: () => <MusicProsManager />,
});
