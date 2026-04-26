import { supabase } from "@/integrations/supabase/client";

type TrackParams = {
  itemType: "lesson" | "podcast";
  itemId: string;
  eventType: "start" | "progress" | "complete" | "seek" | "dropoff";
  courseId?: string | null;
  seriesId?: string | null;
  positionSeconds?: number | null;
  durationSeconds?: number | null;
  percent?: number | null;
};

/**
 * Records an academy view/progress event. Fire-and-forget; errors are swallowed.
 */
export async function trackAcademyEvent(params: TrackParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("academy_view_events").insert({
      user_id: user?.id ?? null,
      item_type: params.itemType,
      item_id: params.itemId,
      course_id: params.courseId ?? null,
      series_id: params.seriesId ?? null,
      event_type: params.eventType,
      position_seconds: params.positionSeconds ?? null,
      duration_seconds: params.durationSeconds ?? null,
      percent: params.percent ?? null,
    });
  } catch {
    // ignore
  }
}
