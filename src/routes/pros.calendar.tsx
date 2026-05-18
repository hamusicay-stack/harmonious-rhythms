import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeGuards";
import { MusicianCalendarHub } from "@/components/pros/MusicianCalendarHub";

export const Route = createFileRoute("/pros/calendar")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "יומן אירועים — המוזיקאי" }] }),
  component: () => (
    <div dir="rtl" className="container mx-auto max-w-5xl px-3 sm:px-6 py-6">
      <MusicianCalendarHub />
    </div>
  ),
});
