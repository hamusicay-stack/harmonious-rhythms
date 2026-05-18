// Supabase Edge Function: ingest-ai-shorts
// Fetches YouTube RSS feeds for configured channels, rewrites titles/descriptions
// into catchy Hebrew via OpenAI, and inserts pending-review entries into musician_shorts.
//
// Deploy:   supabase functions deploy ingest-ai-shorts --no-verify-jwt
// Secrets:  OPENAI_API_KEY (already configured for ingest-ai-news)
// Invoke:   POST /functions/v1/ingest-ai-shorts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const MAX_PER_CHANNEL = 3;

type FeedEntry = { videoId: string; title: string; description: string };

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function parseYouTubeFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of entries) {
    const idM = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descM =
      block.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/i) ||
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (!idM || !titleM) continue;
    out.push({
      videoId: idM[1].trim(),
      title: decodeEntities(titleM[1]).trim(),
      description: descM ? decodeEntities(descM[1]).trim() : "",
    });
  }
  return out;
}

async function rewriteWithOpenAI(entry: FeedEntry): Promise<{ hebrew_title: string; hebrew_description: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are a viral social media manager for a Hebrew music platform. Translate and adapt the provided YouTube video into a highly engaging, catchy, short Hebrew title (max 70 chars) and a 1-2 sentence Hebrew description with relevant emojis. Return JSON: { \"hebrew_title\": string, \"hebrew_description\": string }.",
        },
        {
          role: "user",
          content: `Original title: ${entry.title}\n\nOriginal description: ${entry.description}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  if (!parsed.hebrew_title) throw new Error("OpenAI missing hebrew_title");
  return {
    hebrew_title: String(parsed.hebrew_title).slice(0, 120),
    hebrew_description: String(parsed.hebrew_description ?? "").slice(0, 500),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary = { channels: 0, fetched: 0, inserted: 0, errors: [] as string[] };

  try {
    const { data: sources, error: srcErr } = await supabase
      .from("shorts_sources")
      .select("id, channel_name, channel_id")
      .eq("is_active", true);
    if (srcErr) throw srcErr;
    summary.channels = sources?.length ?? 0;

    for (const src of sources ?? []) {
      try {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(src.channel_id)}`;
        const xmlRes = await fetch(url, { headers: { "User-Agent": "HaMuzikai-ShortsBot/1.0" } });
        if (!xmlRes.ok) throw new Error(`RSS ${xmlRes.status}`);
        const entries = parseYouTubeFeed(await xmlRes.text()).slice(0, MAX_PER_CHANNEL);
        summary.fetched += entries.length;

        for (const entry of entries) {
          try {
            const { data: existing } = await supabase
              .from("musician_shorts")
              .select("id")
              .eq("youtube_video_id", entry.videoId)
              .maybeSingle();
            if (existing) continue;

            const ai = await rewriteWithOpenAI(entry);

            const { error: insErr } = await supabase.from("musician_shorts").insert({
              youtube_video_id: entry.videoId,
              title: ai.hebrew_title,
              description: ai.hebrew_description,
              channel_name: src.channel_name,
              approval_status: "pending_review",
            });
            if (insErr) throw insErr;
            summary.inserted += 1;
          } catch (itemErr) {
            const msg = `[${src.channel_name}] ${entry.videoId}: ${(itemErr as Error).message}`;
            console.error(msg);
            summary.errors.push(msg);
          }
        }
      } catch (loopErr) {
        const msg = `[${src.channel_name}] channel failed: ${(loopErr as Error).message}`;
        console.error(msg);
        summary.errors.push(msg);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (fatal) {
    console.error("Fatal:", fatal);
    return new Response(
      JSON.stringify({ ok: false, error: (fatal as Error).message, ...summary }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
