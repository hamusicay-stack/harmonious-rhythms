import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCategoriesWithBoards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: cats, error: e1 } = await supabase
      .from("forum_categories")
      .select("id, name, slug, description, icon, color, display_order")
      .order("display_order");
    if (e1) throw new Error(e1.message);

    const { data: boards, error: e2 } = await (supabase as any)
      .from("forum_boards")
      .select("id, category_id, name, slug, description, icon, display_order, topic_count, post_count, last_post_at, last_topic_id, post_min_role")
      .order("display_order");
    if (e2) throw new Error(e2.message);

    // Enrich with last topic + author info (NodeBB-style "Last Post" snippet)
    const lastTopicIds = (boards ?? []).map((b) => b.last_topic_id).filter(Boolean) as string[];
    let topicsById = new Map<string, { title: string; slug: string; last_post_user_id: string | null; last_post_at: string | null }>();
    let authorsById = new Map<string, { id: string; username: string | null; display_name: string | null; avatar_url: string | null }>();
    if (lastTopicIds.length > 0) {
      const { data: topics } = await supabase
        .from("forum_topics")
        .select("id, title, slug, last_post_user_id, last_post_at")
        .in("id", lastTopicIds);
      (topics ?? []).forEach((t) => topicsById.set(t.id, t));
      const authorIds = Array.from(new Set((topics ?? []).map((t) => t.last_post_user_id).filter(Boolean))) as string[];
      if (authorIds.length > 0) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds);
        (profs ?? []).forEach((p: any) => authorsById.set(p.id, p));
      }
    }

    return {
      categories: (cats ?? []).map((c) => ({
        ...c,
        boards: (boards ?? [])
          .filter((b) => b.category_id === c.id)
          .map((b) => {
            const t = b.last_topic_id ? topicsById.get(b.last_topic_id) : null;
            const a = t?.last_post_user_id ? authorsById.get(t.last_post_user_id) : null;
            return {
              ...b,
              last_topic: t
                ? {
                    title: t.title,
                    slug: t.slug,
                    last_post_at: t.last_post_at,
                    author: a ?? null,
                  }
                : null,
            };
          }),
      })),
    };
  });

export const getBoardBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: board, error } = await supabase
      .from("forum_boards")
      .select("id, category_id, name, slug, description, icon, topic_count, post_count")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!board) return { board: null, category: null };
    const { data: cat } = await supabase
      .from("forum_categories")
      .select("id, name, slug, color")
      .eq("id", board.category_id)
      .maybeSingle();
    return { board, category: cat ?? null };
  });
