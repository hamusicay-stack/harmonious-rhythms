import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, topic_id, author_id, body_md, is_op, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(8);

    const topicIds = Array.from(new Set((posts ?? []).map((p) => p.topic_id)));
    const userIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));

    const [{ data: topics }, { data: profiles }] = await Promise.all([
      topicIds.length
        ? supabase.from("forum_topics").select("id, title, slug").in("id", topicIds)
        : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[] }),
    ]);

    const tMap = new Map((topics ?? []).map((t) => [t.id, t]));
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const items = (posts ?? []).map((p) => {
      const t = tMap.get(p.topic_id);
      const a = pMap.get(p.author_id);
      const text = (p.body_md ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        id: p.id,
        topic_slug: t?.slug ?? null,
        topic_title: t?.title ?? "",
        author_name: a?.display_name ?? a?.username ?? "משתמש",
        author_avatar: a?.avatar_url ?? null,
        is_op: p.is_op,
        excerpt: text.slice(0, 80),
        created_at: p.created_at,
      };
    }).filter((x) => x.topic_slug);

    return { items: items.slice(0, 5) };
  });
