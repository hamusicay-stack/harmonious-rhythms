import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Extracts audio from a YouTube video using RapidAPI youtube-mp36
 * and uploads it to the podcast-audio bucket. Updates the podcast row.
 */
export const extractMp3FromYouTube = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      podcast_id: z.string().uuid(),
      youtube_url: z.string().url(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return { ok: false, error: "RAPIDAPI_KEY not configured" };

    const videoId = extractYtId(data.youtube_url);
    if (!videoId) return { ok: false, error: "URL לא תקין" };

    // mark as processing
    await supabaseAdmin
      .from("academy_podcasts")
      .update({ audio_status: "processing" })
      .eq("id", data.podcast_id);

    try {
      // Step 1: request conversion (the service caches results, so it's usually fast)
      const apiRes = await fetch(
        `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
        {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
          },
        },
      );
      if (!apiRes.ok) throw new Error(`RapidAPI ${apiRes.status}`);
      const json = (await apiRes.json()) as {
        status?: string;
        link?: string;
        msg?: string;
        title?: string;
      };

      if (json.status !== "ok" || !json.link) {
        throw new Error(json.msg || "המרה נכשלה - נסה שוב בעוד מספר שניות");
      }

      // Step 2: download MP3
      const mp3Res = await fetch(json.link);
      if (!mp3Res.ok) throw new Error("Failed to download MP3");
      const buf = new Uint8Array(await mp3Res.arrayBuffer());

      // Step 3: upload to storage
      const path = `youtube/${videoId}-${Date.now()}.mp3`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("podcast-audio")
        .upload(path, buf, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabaseAdmin.storage
        .from("podcast-audio")
        .getPublicUrl(path);

      // Step 4: update podcast row
      await supabaseAdmin
        .from("academy_podcasts")
        .update({
          audio_url: pub.publicUrl,
          audio_status: "ready",
          audio_generated_at: new Date().toISOString(),
        })
        .eq("id", data.podcast_id);

      return { ok: true, audio_url: pub.publicUrl };
    } catch (e: any) {
      await supabaseAdmin
        .from("academy_podcasts")
        .update({ audio_status: "error" })
        .eq("id", data.podcast_id);
      return { ok: false, error: e?.message ?? "שגיאה לא ידועה" };
    }
  });

function extractYtId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
