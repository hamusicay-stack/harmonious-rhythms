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

    const { data: boards, error: e2 } = await supabase
      .from("forum_boards")
      .select("id, category_id, name, slug, description, icon, display_order, topic_count, post_count, last_post_at, last_topic_id")
      .order("display_order");
    if (e2) throw new Error(e2.message);

    return {
      categories: (cats ?? []).map((c) => ({
        ...c,
        boards: (boards ?? []).filter((b) => b.category_id === c.id),
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
