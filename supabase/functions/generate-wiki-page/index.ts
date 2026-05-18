// Supabase Edge Function: generate-wiki-page
// Generates a Hebrew encyclopedic article via OpenAI and stores it in wiki_articles.
//
// POST body: { term: string, category: "instruments"|"audio_tech"|"artists"|"music_theory" }

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

const ALLOWED_CATEGORIES = ["instruments", "audio_tech", "artists", "music_theory"] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const SYSTEM_PROMPT = `You are an expert music encyclopedist for 'Visikai' (a Hebrew Wikipedia for musicians). Write a comprehensive, highly detailed, and accurate encyclopedic article in Hebrew about the term provided by the user. Include history, technical specifications, pros/cons, and impact on the music industry. Output the result in beautiful, semantic HTML (using <h1>, <h2>, <ul>, <li>, <strong>). Do NOT wrap the HTML in markdown backticks.`;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${base || "article"}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanHtml(s: string): string {
  return s.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractSummary(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 240);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const term = String(body?.term ?? "").trim();
    const category = String(body?.category ?? "").trim() as Category;

    if (term.length < 2 || term.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid term" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Term: ${term}\nCategory: ${category}` },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "OpenAI error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const rawContent = aiJson?.choices?.[0]?.message?.content ?? "";
    const contentHtml = cleanHtml(rawContent);

    if (!contentHtml || contentHtml.length < 50) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into wiki_articles (service role bypasses RLS; we still validated input)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const slug = slugify(term);
    const summary = extractSummary(contentHtml);

    const { data, error } = await supabase
      .from("wiki_articles")
      .insert({
        title: term,
        slug,
        category,
        summary,
        content: contentHtml,
        is_verified: true,
      })
      .select("id, slug, title")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: "DB insert failed", detail: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, article: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unhandled", detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
