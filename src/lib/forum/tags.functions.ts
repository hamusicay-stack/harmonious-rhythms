import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { slugify } from "./utils";

export type ForumTagRow = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  parent_id: string | null;
  is_staff_only: boolean;
  use_count: number;
};

/** List all tags. Non-staff only see non-staff tags. */
export const listForumTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set(((roles ?? []) as { role: string }[]).map((r) => r.role));
    const isStaff = roleSet.has("admin") || roleSet.has("moderator");

    let q = (supabase as any)
      .from("forum_tags")
      .select("id, slug, name, color, parent_id, is_staff_only, use_count")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (!isStaff) q = q.eq("is_staff_only", false);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { tags: (data ?? []) as ForumTagRow[], isStaff };
  });

/** Create a new tag. Staff-only / parent_id require admin or moderator. */
export const createForumTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(2).max(40),
        parentId: z.string().uuid().nullable().optional(),
        isStaffOnly: z.boolean().optional().default(false),
        color: z.string().max(20).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const slug = slugify(data.name);
    const { data: existing } = await supabase
      .from("forum_tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) return { id: existing.id, slug };

    const insertPayload: Record<string, unknown> = {
      slug,
      name: data.name,
      color: data.color ?? null,
      parent_id: data.parentId ?? null,
      is_staff_only: !!data.isStaffOnly,
    };
    const { data: ins, error } = await (supabase as any)
      .from("forum_tags")
      .insert(insertPayload)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id, slug: ins.slug };
  });

/** Set the full tag set for a topic (replaces). Enforces max 5 + ACL via triggers. */
export const setTopicTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        topicId: z.string().uuid(),
        tagIds: z.array(z.string().uuid()).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: topic } = await supabase
      .from("forum_topics")
      .select("author_id")
      .eq("id", data.topicId)
      .maybeSingle();
    if (!topic) throw new Error("האשכול לא נמצא");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set(((roles ?? []) as { role: string }[]).map((r) => r.role));
    const isStaff = roleSet.has("admin") || roleSet.has("moderator");
    if (topic.author_id !== userId && !isStaff) throw new Error("אין הרשאה");

    await supabase.from("forum_topic_tags").delete().eq("topic_id", data.topicId);
    if (data.tagIds.length) {
      const rows = data.tagIds.map((tag_id) => ({ topic_id: data.topicId, tag_id }));
      const { error } = await supabase.from("forum_topic_tags").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Get tag rows attached to a topic (public — uses admin client for SEO/SSR safety). */
export const getTopicTags = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ topicId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: links } = await supabaseAdmin
      .from("forum_topic_tags")
      .select("tag_id")
      .eq("topic_id", data.topicId);
    const ids = (links ?? []).map((l: { tag_id: string }) => l.tag_id);
    if (!ids.length) return { tags: [] as ForumTagRow[] };
    const { data: tags } = await (supabaseAdmin as any)
      .from("forum_tags")
      .select("id, slug, name, color, parent_id, is_staff_only, use_count")
      .in("id", ids);
    return { tags: (tags ?? []) as ForumTagRow[] };
  });
