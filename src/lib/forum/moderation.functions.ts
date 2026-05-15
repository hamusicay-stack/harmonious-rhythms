import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureMod(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles")
    .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("אין הרשאה");
}

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ status: z.enum(["open", "reviewed", "dismissed"]).default("open") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureMod(supabase, userId);
    const { data: rows, error } = await supabase
      .from("forum_reports")
      .select("id, reporter_id, target_type, target_id, reason, status, reviewed_at, created_at")
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { reports: rows ?? [] };
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      reportId: z.string().uuid(),
      status: z.enum(["reviewed", "dismissed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureMod(supabase, userId);
    const { error } = await supabase.from("forum_reports").update({
      status: data.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    }).eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getForumUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, forum_signature, forum_post_count, forum_reputation, forum_rank, created_at")
      .eq("username", data.username)
      .maybeSingle();
    if (!profile) return { profile: null, recentTopics: [], recentPosts: [] };
    const [{ data: topics }, { data: posts }] = await Promise.all([
      supabase.from("forum_topics")
        .select("id, title, slug, created_at, reply_count")
        .eq("author_id", profile.id).eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("forum_posts")
        .select("id, topic_id, body_md, created_at")
        .eq("author_id", profile.id).eq("is_deleted", false).eq("is_op", false)
        .order("created_at", { ascending: false }).limit(10),
    ]);
    const topicIds = Array.from(new Set((posts ?? []).map((p) => p.topic_id)));
    const topicRows = topicIds.length
      ? (await supabase.from("forum_topics").select("id, title, slug").in("id", topicIds)).data ?? []
      : [];
    const tmap = new Map(topicRows.map((t) => [t.id, t]));
    return {
      profile,
      recentTopics: topics ?? [],
      recentPosts: (posts ?? []).map((p) => ({ ...p, topic: tmap.get(p.topic_id) ?? null })),
    };
  });
