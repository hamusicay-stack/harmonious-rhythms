import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDmThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: threads, error } = await supabase
      .from("forum_dm_threads")
      .select("id, user_a, user_b, last_message_at, last_message_preview, unread_a, unread_b")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const otherIds = (threads ?? []).map((t) => (t.user_a === userId ? t.user_b : t.user_a));
    const profiles = otherIds.length
      ? (await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", otherIds)).data ?? []
      : [];
    const map = new Map(profiles.map((p) => [p.id, p]));
    return {
      threads: (threads ?? []).map((t) => {
        const otherId = t.user_a === userId ? t.user_b : t.user_a;
        const unread = t.user_a === userId ? t.unread_a : t.unread_b;
        return { ...t, other: map.get(otherId) ?? null, unread };
      }),
    };
  });

export const openOrCreateDmThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ otherUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.otherUserId === userId) throw new Error("לא ניתן לשלוח הודעה לעצמך");
    const [a, b] = [userId, data.otherUserId].sort();
    const { data: existing } = await supabase.from("forum_dm_threads")
      .select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (existing) return { threadId: existing.id };
    const { data: ins, error } = await supabase.from("forum_dm_threads")
      .insert({ user_a: a, user_b: b }).select("id").single();
    if (error) throw new Error(error.message);
    return { threadId: ins.id };
  });

export const getDmThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread, error } = await supabase.from("forum_dm_threads")
      .select("id, user_a, user_b, unread_a, unread_b").eq("id", data.threadId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) return { thread: null, messages: [], other: null };
    const otherId = thread.user_a === userId ? thread.user_b : thread.user_a;
    const [{ data: msgs }, { data: other }] = await Promise.all([
      supabase.from("forum_direct_messages")
        .select("id, sender_id, body, created_at").eq("thread_id", data.threadId).order("created_at"),
      supabase.from("profiles").select("id, display_name, username, avatar_url").eq("id", otherId).maybeSingle(),
    ]);
    // mark as read
    const patch = thread.user_a === userId ? { unread_a: 0 } : { unread_b: 0 };
    await supabase.from("forum_dm_threads").update(patch).eq("id", data.threadId);
    return { thread, messages: msgs ?? [], other };
  });

export const sendDm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ threadId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("forum_direct_messages")
      .insert({ thread_id: data.threadId, sender_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
