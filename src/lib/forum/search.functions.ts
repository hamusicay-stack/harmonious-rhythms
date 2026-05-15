import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchForum = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      q: z.string().trim().min(2).max(120),
      limit: z.number().int().min(5).max(50).default(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const term = data.q.replace(/[%_]/g, "");
    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, topic_id, body_md, author_id, created_at")
      .ilike("body_md", `%${term}%`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const { data: topics } = await supabase
      .from("forum_topics")
      .select("id, title, slug, board_id, author_id, created_at")
      .ilike("title", `%${term}%`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const topicIds = Array.from(new Set([
      ...(posts ?? []).map((p) => p.topic_id),
      ...(topics ?? []).map((t) => t.id),
    ]));
    const topicRows = topicIds.length
      ? (await supabase.from("forum_topics").select("id, title, slug").in("id", topicIds)).data ?? []
      : [];
    const topicMap = new Map(topicRows.map((t) => [t.id, t]));

    return {
      topics: topics ?? [],
      posts: (posts ?? []).map((p) => ({ ...p, topic: topicMap.get(p.topic_id) ?? null })),
    };
  });
