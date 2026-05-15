import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { slugify, withRandomSuffix } from "./utils";

/** Public (no-auth) topic meta for SEO head() in route loaders. */
export const getTopicMeta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: t } = await supabaseAdmin
      .from("forum_topics")
      .select("id, title, slug, board_id, created_at, is_deleted")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!t || t.is_deleted) return { title: null, excerpt: null, board: null };
    const { data: op } = await supabaseAdmin
      .from("forum_posts")
      .select("body_md")
      .eq("topic_id", t.id)
      .eq("is_op", true)
      .maybeSingle();
    const { data: board } = await supabaseAdmin
      .from("forum_boards").select("name, slug").eq("id", t.board_id).maybeSingle();
    const text = (op?.body_md ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      title: t.title,
      excerpt: text.slice(0, 160),
      board,
    };
  });

export const listTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      boardSlug: z.string().min(1).max(120),
      page: z.number().int().min(1).max(500).default(1),
      pageSize: z.number().int().min(5).max(50).default(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: board } = await supabase.from("forum_boards")
      .select("id").eq("slug", data.boardSlug).maybeSingle();
    if (!board) return { topics: [], total: 0 };

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: topics, count, error } = await supabase
      .from("forum_topics")
      .select("id, title, slug, is_locked, is_pinned, view_count, reply_count, last_post_at, last_post_user_id, author_id, created_at", { count: "exact" })
      .eq("board_id", board.id)
      .eq("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("last_post_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set([
      ...(topics ?? []).map((t) => t.author_id),
      ...(topics ?? []).map((t) => t.last_post_user_id).filter(Boolean) as string[],
    ]));
    const profiles = userIds.length
      ? (await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)).data ?? []
      : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return {
      topics: (topics ?? []).map((t) => ({
        ...t,
        author: profileMap.get(t.author_id) ?? null,
        last_poster: t.last_post_user_id ? profileMap.get(t.last_post_user_id) ?? null : null,
      })),
      total: count ?? 0,
    };
  });

export const getTopicBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: topic, error } = await supabase
      .from("forum_topics")
      .select("id, board_id, title, slug, is_locked, is_pinned, is_deleted, view_count, reply_count, author_id, created_at, last_post_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!topic) return { topic: null, board: null, posts: [], authors: {} };

    const { data: board } = await supabase.from("forum_boards")
      .select("id, name, slug, category_id").eq("id", topic.board_id).maybeSingle();

    const { data: posts } = await supabase.from("forum_posts")
      .select("id, author_id, body_md, quoted_post_id, is_op, is_deleted, edited_at, created_at")
      .eq("topic_id", topic.id)
      .order("created_at");

    const userIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));
    const profiles = userIds.length
      ? (await supabase.from("profiles").select("id, display_name, username, avatar_url, forum_signature, forum_post_count, forum_reputation, forum_rank").in("id", userIds)).data ?? []
      : [];
    const authorMap: Record<string, typeof profiles[number]> = {};
    for (const p of profiles) authorMap[p.id] = p;

    // increment view (best effort, ignore failure)
    await supabase.from("forum_topics").update({ view_count: topic.view_count + 1 }).eq("id", topic.id);

    return { topic, board, posts: posts ?? [], authors: authorMap };
  });

export const createTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      boardSlug: z.string().min(1).max(120),
      title: z.string().trim().min(3).max(200),
      body: z.string().trim().min(5).max(20000),
      tags: z.array(z.string().min(1).max(40)).max(8).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: board } = await supabase.from("forum_boards")
      .select("id").eq("slug", data.boardSlug).maybeSingle();
    if (!board) throw new Error("הלוח לא נמצא");

    const slug = withRandomSuffix(slugify(data.title));
    const { data: topic, error: e1 } = await supabase
      .from("forum_topics")
      .insert({ board_id: board.id, author_id: userId, title: data.title, slug })
      .select("id, slug")
      .single();
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabase
      .from("forum_posts")
      .insert({ topic_id: topic.id, author_id: userId, body_md: data.body, is_op: true });
    if (e2) throw new Error(e2.message);

    if (data.tags.length) {
      // upsert tags
      for (const raw of data.tags) {
        const tagSlug = slugify(raw);
        const { data: existing } = await supabase.from("forum_tags")
          .select("id").eq("slug", tagSlug).maybeSingle();
        let tagId = existing?.id;
        if (!tagId) {
          const { data: ins } = await supabase.from("forum_tags")
            .insert({ slug: tagSlug, name: raw }).select("id").single();
          tagId = ins?.id;
        }
        if (tagId) {
          await supabase.from("forum_topic_tags").insert({ topic_id: topic.id, tag_id: tagId });
        }
      }
    }

    return { topicId: topic.id, slug: topic.slug };
  });

export const setTopicFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      topicId: z.string().uuid(),
      flag: z.enum(["lock", "unlock", "pin", "unpin", "delete", "restore"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("אין הרשאה");

    const patch =
      data.flag === "lock"   ? { is_locked: true } :
      data.flag === "unlock" ? { is_locked: false } :
      data.flag === "pin"    ? { is_pinned: true } :
      data.flag === "unpin"  ? { is_pinned: false } :
      data.flag === "delete" ? { is_deleted: true } :
                                { is_deleted: false };

    const { error } = await supabase.from("forum_topics").update(patch).eq("id", data.topicId);
    if (error) throw new Error(error.message);

    await supabase.from("forum_moderation_log").insert({
      moderator_id: userId,
      action: data.flag,
      target_type: "topic",
      target_id: data.topicId,
    });

    return { ok: true };
  });
