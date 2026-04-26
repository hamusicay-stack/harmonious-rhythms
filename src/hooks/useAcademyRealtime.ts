import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to changes on academy tables and calls onChange when any update arrives.
 * Use this in pages that list courses/podcasts so new uploads appear instantly.
 */
export function useAcademyRealtime(
  tables: Array<"academy_courses" | "academy_lessons" | "academy_podcasts" | "academy_podcast_series" | "academy_enrollments">,
  onChange: () => void,
) {
  useEffect(() => {
    const channel = supabase.channel(`academy-rt-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach((table) => {
      (channel as any).on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange(),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);
}
