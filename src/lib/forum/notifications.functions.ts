import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listForumNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(100).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("forum_notifications")
      .select("id, kind, title, body, link, actor_id, metadata, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[]));
    const actors = actorIds.length
      ? (await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", actorIds)).data ?? []
      : [];
    const map = new Map(actors.map((a) => [a.id, a]));
    return {
      notifications: (rows ?? []).map((r) => ({ ...r, actor: r.actor_id ? map.get(r.actor_id) ?? null : null })),
      unread: (rows ?? []).filter((r) => !r.read_at).length,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ids: z.array(z.string().uuid()).optional(), all: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("forum_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId);
    if (data.ids?.length) q = q.in("id", data.ids);
    else if (!data.all) return { ok: true };
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
