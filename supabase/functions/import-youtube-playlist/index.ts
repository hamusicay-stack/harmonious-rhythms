// Imports videos from a public YouTube playlist into a podcast series.
// Uses public YouTube playlist sources (no API key required).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractPlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

type Episode = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
};

async function fetchPlaylist(playlistId: string): Promise<{ episodes: Episode[]; meta: PlaylistMeta }> {
  const page = await fetchPlaylistPage(playlistId).catch(() => ({ episodes: [], meta: {} as PlaylistMeta }));
  if (page.episodes.length > 0) return page;

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Playlist not found or not public (${res.status})`);
  const xml = await res.text();

  const episodes: Episode[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const description = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]?.trim() ?? "";
    const thumbnail = entry.match(/<media:thumbnail\s+url="([^"]+)"/)?.[1] ?? "";
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    if (videoId) {
      episodes.push({
        videoId,
        title: decodeXml(title),
        description: decodeXml(description),
        thumbnail,
        publishedAt,
      });
    }
  }
  const feedTitle = xml.match(/<title>([^<]+)<\/title>/)?.[1];
  const author = xml.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/)?.[1];
  return { episodes, meta: { title: feedTitle ? decodeXml(feedTitle) : undefined, channelName: author ? decodeXml(author) : undefined } };
}

type PlaylistMeta = { title?: string; channelName?: string; thumbnail?: string; description?: string };

async function fetchPlaylistPage(playlistId: string): Promise<{ episodes: Episode[]; meta: PlaylistMeta }> {
  const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return { episodes: [], meta: {} };
  const html = await res.text();
  const rawJson = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)?.[1]
    ?? html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/)?.[1];
  if (!rawJson) return { episodes: [], meta: {} };

  const initialData = JSON.parse(rawJson);
  const videos: Episode[] = [];
  const seen = new Set<string>();

  const textOf = (value: any): string => {
    if (!value) return "";
    if (typeof value.simpleText === "string") return value.simpleText;
    if (Array.isArray(value.runs)) return value.runs.map((run: any) => run.text ?? "").join("");
    return "";
  };

  const meta: PlaylistMeta = {};
  const sidebar = initialData?.sidebar?.playlistSidebarRenderer?.items ?? [];
  for (const item of sidebar) {
    const primary = item?.playlistSidebarPrimaryInfoRenderer;
    if (primary) {
      meta.title = textOf(primary.title);
      meta.description = textOf(primary.description);
      meta.thumbnail = primary.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.at(-1)?.url;
    }
    const secondary = item?.playlistSidebarSecondaryInfoRenderer;
    if (secondary) {
      meta.channelName = textOf(secondary.videoOwner?.videoOwnerRenderer?.title);
    }
  }
  // Fallback from header
  if (!meta.title) meta.title = textOf(initialData?.header?.playlistHeaderRenderer?.title);
  if (!meta.channelName) meta.channelName = textOf(initialData?.header?.playlistHeaderRenderer?.ownerText);

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    const item = node.playlistVideoRenderer;
    if (item?.videoId && !seen.has(item.videoId)) {
      seen.add(item.videoId);
      const thumbnails = item.thumbnail?.thumbnails ?? [];
      videos.push({
        videoId: item.videoId,
        title: textOf(item.title) || "פרק ללא שם",
        description: textOf(item.descriptionSnippet),
        thumbnail: thumbnails.at(-1)?.url ?? `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
        publishedAt: "",
      });
    }
    if (Array.isArray(node)) node.forEach(visit);
    else Object.values(node).forEach(visit);
  };

  visit(initialData);
  return { episodes: videos, meta };
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { series_id, playlist_url } = await req.json();
    if (!series_id || !playlist_url) {
      return new Response(JSON.stringify({ error: "series_id and playlist_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const playlistId = extractPlaylistId(playlist_url);
    if (!playlistId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube playlist URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await userClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Update series with playlist info
    const { episodes, meta } = await fetchPlaylist(playlistId);

    // Update series with playlist info + auto-fill metadata if missing
    const { data: existingSeries } = await admin
      .from("academy_podcast_series").select("title, host_name, cover_url, description").eq("id", series_id).maybeSingle();

    const seriesUpdate: Record<string, unknown> = {
      youtube_playlist_url: playlist_url,
      youtube_playlist_id: playlistId,
    };
    if (meta.title && (!existingSeries?.title || existingSeries.title.trim() === "")) seriesUpdate.title = meta.title;
    if (meta.channelName && !existingSeries?.host_name) seriesUpdate.host_name = meta.channelName;
    if (meta.description && !existingSeries?.description) seriesUpdate.description = meta.description;
    if (!existingSeries?.cover_url) {
      const cover = meta.thumbnail ?? (episodes[0]?.thumbnail ?? null);
      if (cover) seriesUpdate.cover_url = cover;
    }
    await admin.from("academy_podcast_series").update(seriesUpdate).eq("id", series_id);

    let imported = 0;
    let skipped = 0;
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const sourceUrl = `https://www.youtube.com/watch?v=${ep.videoId}&list=${playlistId}`;
      const payload = {
        series_id,
        youtube_video_id: ep.videoId,
        title: ep.title,
        description: ep.description,
        kind: "youtube",
        source_url: sourceUrl,
        thumbnail_url: ep.thumbnail,
        episode_number: i + 1,
        sort_order: i,
        created_by: user.id,
        is_active: true,
      };

      const { data: existing } = await admin
        .from("academy_podcasts")
        .select("id")
        .eq("youtube_video_id", ep.videoId)
        .maybeSingle();

      const { error } = existing?.id
        ? await admin.from("academy_podcasts").update(payload).eq("id", existing.id)
        : await admin.from("academy_podcasts").insert(payload);
      if (error) skipped++; else imported++;
    }

    return new Response(JSON.stringify({ imported, skipped, total: episodes.length, series: meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
