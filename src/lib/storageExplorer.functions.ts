import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const KNOWN_BUCKETS = [
  "academy", "banners", "beat-audio", "beat-video", "cpi-uploads",
  "forum-attachments", "marketplace", "marketplace-categories", "music-pros",
  "news-covers", "organ-themes", "podcast-audio", "profile-banners",
  "rhythm-files", "shop-digital", "shop-products", "shop-trade-in", "shorts",
] as const;

export const listStorageBuckets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(error.message);
    return (data ?? []).map(b => ({ id: b.id, name: b.name, public: b.public }));
  });

type StorageObj = { name: string; path: string; size: number; updated_at: string | null; created_at: string | null; mimetype: string | null };

async function walkBucket(bucket: string, prefix = "", out: StorageObj[] = [], depth = 0): Promise<StorageObj[]> {
  if (depth > 4) return out;
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(error.message);
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    // Folders have no id / no metadata
    if (!item.id && !item.metadata) {
      await walkBucket(bucket, fullPath, out, depth + 1);
    } else {
      out.push({
        name: item.name,
        path: fullPath,
        size: (item.metadata as { size?: number } | null)?.size ?? 0,
        updated_at: item.updated_at,
        created_at: item.created_at,
        mimetype: (item.metadata as { mimetype?: string } | null)?.mimetype ?? null,
      });
    }
  }
  return out;
}

export const listStorageObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bucket: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const objects = await walkBucket(data.bucket);
    const totalBytes = objects.reduce((s, o) => s + (o.size || 0), 0);
    return { objects, totalBytes, count: objects.length };
  });

export const deleteStorageObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    bucket: z.string().min(1).max(64),
    path: z.string().min(1).max(1024),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.storage.from(data.bucket).remove([data.path]);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("system_audit_logs").insert({
      user_id: context.userId,
      user_type: "admin",
      action: "storage.delete",
      entity: "storage_object",
      entity_id: `${data.bucket}/${data.path}`,
      details: { bucket: data.bucket, path: data.path },
    });
    return { ok: true };
  });

// Reference scanners — extract referenced paths from known URL columns
async function collectRefs(bucket: string): Promise<Set<string>> {
  const refs = new Set<string>();
  const add = (url: string | null | undefined) => {
    if (!url) return;
    // Match anything after /<bucket>/
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      const tail = url.substring(idx + marker.length).split("?")[0];
      if (tail) refs.add(tail);
    }
  };

  // Map bucket → tables/columns to scan
  const scans: Array<{ table: string; cols: string[]; arrayCols?: string[] }> = [];
  switch (bucket) {
    case "shop-products":
      scans.push({ table: "shop_products", cols: ["image_url"], arrayCols: ["images"] });
      break;
    case "marketplace":
      scans.push({ table: "marketplace_listings", cols: [], arrayCols: ["images"] });
      break;
    case "shorts":
      scans.push({ table: "shorts", cols: ["video_url", "thumbnail_url"] });
      break;
    case "beat-audio":
    case "beat-video":
      scans.push({ table: "rhythm_sets", cols: ["preview_url", "cover_url", "download_url"] });
      break;
    case "news-covers":
      scans.push({ table: "news_articles", cols: ["cover_image_url"] });
      break;
    case "banners":
      scans.push({ table: "banners", cols: ["image_url"] });
      break;
    case "music-pros":
      scans.push({ table: "music_pros", cols: ["cover_image_url", "avatar_url"], arrayCols: ["gallery"] });
      break;
    case "profile-banners":
      scans.push({ table: "profiles", cols: ["banner_url"] });
      break;
    case "academy":
      scans.push({ table: "academy_lessons", cols: ["video_url", "thumbnail_url"] });
      break;
    case "podcast-audio":
      scans.push({ table: "academy_podcasts", cols: ["audio_url", "cover_url"] });
      break;
    case "cpi-uploads":
      scans.push({ table: "cpi_files", cols: ["file_url"] });
      break;
    case "forum-attachments":
      scans.push({ table: "forum_attachments", cols: ["url"] });
      break;
    default:
      // No scanner — treat all as potential orphans (admin should be cautious)
      break;
  }

  for (const s of scans) {
    const cols = [...s.cols, ...(s.arrayCols ?? [])];
    if (!cols.length) continue;
    const { data, error } = await (supabaseAdmin as never as {
      from: (t: string) => { select: (c: string) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }> };
    }).from(s.table).select(cols.join(","));
    if (error) continue;
    for (const row of (data ?? [])) {
      for (const c of s.cols) add(row[c] as string | null);
      for (const c of s.arrayCols ?? []) {
        const arr = row[c];
        if (Array.isArray(arr)) for (const v of arr) add(typeof v === "string" ? v : null);
      }
    }
  }

  // Also scan profile avatars for avatar-ish buckets
  if (bucket === "music-pros" || bucket === "profile-banners") {
    const { data } = await supabaseAdmin.from("profiles").select("avatar_url, banner_url");
    for (const row of (data ?? []) as { avatar_url: string | null; banner_url: string | null }[]) {
      add(row.avatar_url); add(row.banner_url);
    }
  }

  return refs;
}

export const findStorageOrphans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bucket: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [objects, refs] = await Promise.all([walkBucket(data.bucket), collectRefs(data.bucket)]);
    const hasScanner = refs.size > 0;
    const orphans = hasScanner
      ? objects.filter(o => !refs.has(o.path) && !refs.has(o.name))
      : [];
    return {
      hasScanner,
      orphanCount: orphans.length,
      orphanBytes: orphans.reduce((s, o) => s + (o.size || 0), 0),
      orphans,
      knownBuckets: KNOWN_BUCKETS,
    };
  });
