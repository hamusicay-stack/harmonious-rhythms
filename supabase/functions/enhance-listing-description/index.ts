// Enhance marketplace listing description using Lovable AI + DB-stored prompt.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_PROMPT = `עבוד כ'עוזר מכירה יד 2' מטעם פלטפורמת 'המיוזיקאי'. כתוב מודעת מכירה משכנעת, בעברית, 2-3 פסקאות קצרות, בלי כותרות, בסלנג של מוזיקאים. שלב את 'המיוזיקאי' ושם המוצר באופן טבעי. החזר רק את גוף המודעה.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      title = "",
      brand = "",
      model = "",
      category = "",
      condition = "",
      year = "",
      price = "",
      city = "",
      current_description = "",
      is_urgent = false,
      extra_notes = "",
    } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, supaKey);

    const { data: prompt } = await supa
      .from("ai_prompts")
      .select("prompt, model, is_active")
      .eq("key", "marketplace_listing_assistant")
      .maybeSingle();

    const systemPrompt = prompt?.is_active && prompt?.prompt ? prompt.prompt : FALLBACK_PROMPT;
    const model_id = prompt?.model || "google/gemini-2.5-pro";

    const userMsg = [
      `כותרת: ${title}`,
      `יצרן/דגם: ${[brand, model].filter(Boolean).join(" ")}`,
      `קטגוריה: ${category}`,
      `מצב: ${condition}`,
      year ? `שנה: ${year}` : "",
      price ? `מחיר מבוקש: ${price} ש"ח` : "",
      city ? `עיר: ${city}` : "",
      `דחיפות: ${is_urgent ? "דחוף" : "רגילה"}`,
      current_description ? `מה שכתבתי עד עכשיו (לשיפור):\n${current_description}` : "",
      extra_notes ? `הערות נוספות מהמוכר: ${extra_notes}` : "",
    ].filter(Boolean).join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model_id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "יותר מדי בקשות, רגע אחד ונסה שוב." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "נדרש תשלום ב-Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      throw new Error("AI failed");
    }

    const data = await aiResp.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ description: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enhance-listing-description error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
