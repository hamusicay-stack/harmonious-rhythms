// Supabase Edge Function: ingest-ai-news
// Scrapes active RSS sources, rewrites items in Hebrew via OpenAI,
// and inserts pending-review articles into music_news.
//
// Deploy:   supabase functions deploy ingest-ai-news --no-verify-jwt
// Secrets:  supabase secrets set OPENAI_API_KEY=sk-...
// Invoke:   curl -X POST https://<project-ref>.functions.supabase.co/ingest-ai-news
//
// Schedule (optional) with pg_cron or an external scheduler hitting the URL hourly.

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
const MAX_ITEMS_PER_FEED = 2;

type RssItem = { title: string; link: string; description: string };
type AiOutput = { title: string; html_content: string };

// --- Minimal RSS / Atom parser (regex-based, no DOM dep) ----------------------
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, "").trim();
}

function pick(tag: string, block: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}

function parseFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // RSS 2.0 <item>
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks) {
    items.push({
      title: stripTags(pick("title", block)),
      link: stripTags(pick("link", block)),
      description: stripTags(pick("description", block)) || stripTags(pick("content:encoded", block)),
    });
  }

  if (items.length === 0) {
    // Atom <entry>
    const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
    for (const block of entryBlocks) {
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      items.push({
        title: stripTags(pick("title", block)),
        link: linkMatch ? linkMatch[1] : "",
        description: stripTags(pick("summary", block)) || stripTags(pick("content", block)),
      });
    }
  }

  return items.filter((i) => i.title && i.link);
}

// --- OpenAI rewrite ----------------------------------------------------------
async function rewriteWithOpenAI(item: RssItem): Promise<AiOutput> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a top-tier music equipment journalist for an Israeli portal. Translate the following news to Hebrew. Rewrite it to be highly engaging for musicians, producers, and keyboardists. Add a catchy title. Format the output as clean HTML paragraphs. Return JSON with 'title' and 'html_content'.",
        },
        {
          role: "user",
          content: `Original title: ${item.title}\n\nOriginal description: ${item.description}\n\nSource: ${item.link}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  if (!parsed.title || !parsed.html_content) {
    throw new Error("OpenAI response missing title/html_content");
  }
  return parsed as AiOutput;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `news-${Date.now()}`;
}

// --- Main handler ------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary = { sources: 0, fetched: 0, inserted: 0, errors: [] as string[] };

  try {
    const { data: sources, error: srcErr } = await supabase
      .from("news_sources")
      .select("id, site_name, rss_url")
      .eq("is_active", true);

    if (srcErr) throw srcErr;
    summary.sources = sources?.length ?? 0;

    for (const src of sources ?? []) {
      try {
        const xmlRes = await fetch(src.rss_url, {
          headers: { "User-Agent": "HaMuzikai-AI-NewsBot/1.0" },
        });
        if (!xmlRes.ok) throw new Error(`RSS ${xmlRes.status}`);
        const xml = await xmlRes.text();
        const items = parseFeed(xml).slice(0, MAX_ITEMS_PER_FEED);
        summary.fetched += items.length;

        for (const item of items) {
          try {
            // Dedupe by source_url
            const { data: existing } = await supabase
              .from("music_news")
              .select("id")
              .eq("source_url", item.link)
              .maybeSingle();
            if (existing) continue;

            const ai = await rewriteWithOpenAI(item);

            const { error: insErr } = await supabase.from("music_news").insert({
              title: ai.title,
              slug: `${slugify(ai.title)}-${Date.now().toString(36)}`,
              content: ai.html_content,
              summary: stripTags(ai.html_content).slice(0, 200),
              source_url: item.link,
              is_automated: true,
              approval_status: "pending_review",
              category: "gear_reviews",
            });
            if (insErr) throw insErr;
            summary.inserted += 1;
          } catch (itemErr) {
            const msg = `[${src.site_name}] item "${item.title}": ${(itemErr as Error).message}`;
            console.error(msg);
            summary.errors.push(msg);
          }
        }
      } catch (srcLoopErr) {
        const msg = `[${src.site_name}] feed failed: ${(srcLoopErr as Error).message}`;
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
