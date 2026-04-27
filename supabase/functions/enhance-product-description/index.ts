// Rewrite a shop product description into a HaMusicay-style review using DB prompt.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK = `כתוב מחדש את התיאור של המוצר בעברית מקצועית, אותנטית, בלי קלישאות AI. שמור על כל הפרטים הטכניים. החזר HTML עם תגיות <p> בלבד, בלי כותרות.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product_name = "", brand = "", model = "", short_description = "", description = "", category = "" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: prompt } = await supa
      .from("ai_prompts").select("prompt, model, is_active")
      .eq("key", "shop_product_rewriter").maybeSingle();
    const systemPrompt = prompt?.is_active && prompt?.prompt ? prompt.prompt : FALLBACK;
    const model_id = prompt?.model || "google/gemini-2.5-pro";

    const userMsg = [
      `שם המוצר: ${product_name}`,
      brand || model ? `מותג/דגם: ${[brand, model].filter(Boolean).join(" ")}` : "",
      category ? `קטגוריה: ${category}` : "",
      short_description ? `תיאור קצר: ${short_description}` : "",
      description ? `תיאור מקור (לשכתוב):\n${description}` : "",
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
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "יותר מדי בקשות, רגע אחד." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "נדרש תשלום ב-Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      throw new Error("AI failed");
    }
    const data = await aiResp.json();
    let text = data?.choices?.[0]?.message?.content?.trim() ?? "";
    // Ensure HTML — wrap in <p> if the model returned plain paragraphs
    if (text && !/<p[\s>]/i.test(text)) {
      text = text.split(/\n{2,}/).map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
    }
    return new Response(JSON.stringify({ description: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enhance-product-description error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
