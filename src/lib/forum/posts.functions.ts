import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      topicId: z.string().uuid(),
      body: z.string().trim().min(1).max(20000),
      quotedPostId: z.string().uuid().optional(),
      parentPostId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("forum_posts").insert({
      topic_id: data.topicId,
      author_id: userId,
      body_md: data.body,
      quoted_post_id: data.quotedPostId ?? null,
      parent_post_id: data.parentPostId ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const editPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      postId: z.string().uuid(),
      body: z.string().trim().min(1).max(20000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("forum_posts")
      .update({ body_md: data.body, edited_at: new Date().toISOString() })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("forum_posts")
      .update({ is_deleted: true, body_md: "[הודעה נמחקה]" })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const votePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      postId: z.string().uuid(),
      value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.value === 0) {
      const { error } = await supabase.from("forum_post_votes")
        .delete().eq("post_id", data.postId).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("forum_post_votes")
        .upsert({ post_id: data.postId, user_id: userId, value: data.value });
      if (error) throw new Error(error.message);
    }
    const { data: agg } = await supabase.from("forum_post_votes")
      .select("value").eq("post_id", data.postId);
    const score = (agg ?? []).reduce((s, r) => s + r.value, 0);
    return { score };
  });

export const getMyVotesForTopic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ topicId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: posts } = await supabase.from("forum_posts")
      .select("id").eq("topic_id", data.topicId);
    const ids = (posts ?? []).map((p) => p.id);
    if (!ids.length) return { votes: {}, scores: {} };
    const [{ data: mine }, { data: all }] = await Promise.all([
      supabase.from("forum_post_votes").select("post_id, value").eq("user_id", userId).in("post_id", ids),
      supabase.from("forum_post_votes").select("post_id, value").in("post_id", ids),
    ]);
    const votes: Record<string, number> = {};
    const scores: Record<string, number> = {};
    for (const id of ids) scores[id] = 0;
    for (const v of mine ?? []) votes[v.post_id] = v.value;
    for (const v of all ?? []) scores[v.post_id] = (scores[v.post_id] ?? 0) + v.value;
    return { votes, scores };
  });

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      targetType: z.enum(["post", "topic", "user"]),
      targetId: z.string().uuid(),
      reason: z.string().trim().min(3).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("forum_reports").insert({
      reporter_id: userId,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
