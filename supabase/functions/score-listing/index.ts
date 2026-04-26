// Lovable AI-powered listing quality scoring for marketplace.
// Returns: { score: 0-100, grade: 'low'|'medium'|'high', tips: string[] }
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  title?: string;
  description?: string;
  price?: number | string;
  category?: string;
  brand?: string;
  model?: string;
  year?: number | string;
  item_condition?: string;
  images_count?: number;
  has_audio?: boolean;
  has_video?: boolean;
  city?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Payload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const summary = [
      `כותרת: ${body.title ?? "(חסר)"}`,
      `תיאור: ${body.description ?? "(חסר)"}`,
      `קטגוריה: ${body.category ?? "(חסר)"}`,
      `יצרן/דגם: ${body.brand ?? "?"} ${body.model ?? ""}`.trim(),
      `שנה: ${body.year ?? "(לא צוין)"}`,
      `מצב: ${body.item_condition ?? "(לא צוין)"}`,
      `מחיר: ${body.price ?? "(לא צוין)"} ש"ח`,
      `מספר תמונות: ${body.images_count ?? 0}`,
      `אודיו: ${body.has_audio ? "כן" : "לא"}`,
      `סרטון: ${body.has_video ? "כן" : "לא"}`,
      `עיר: ${body.city ?? "(לא צוין)"}`,
    ].join("\n");

    const systemPrompt = `אתה מומחה למכירות יד שניה של כלי נגינה וציוד מוזיקלי בישראל.
המטרה שלך: לתת ציון אטרקטיביות 0-100 למודעה ולהציע 3-5 שיפורים קצרים ומעשיים.

קריטריונים:
- כותרת ברורה עם מותג + דגם (משקל גבוה)
- תיאור ארוך ומפורט (אורך, מצב פיזי, סיבת מכירה, אביזרים)
- מספר ומגוון תמונות (אופטימלי 5+)
- אודיו/וידאו דמו = בונוס משמעותי (במיוחד לכלים)
- מחיר הגיוני לקטגוריה
- ציון מצב, שנה, ומיקום
החזר ציון מספרי בלבד וטיפים בעברית, קצרים, ממוקדים, וניתנים ליישום מיידי.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `נא לדרג את המודעה הבאה:\n${summary}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "rate_listing",
            description: "החזר ציון אטרקטיביות 0-100 ורשימת טיפים לשיפור.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100, description: "ציון 0-100" },
                tips: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 6,
                  description: "טיפים קצרים בעברית (משפט אחד כל אחד)",
                },
              },
              required: ["score", "tips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rate_listing" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — נסה שוב בעוד רגע." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום ב-Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      throw new Error("AI scoring failed");
    }

    const data = await aiResp.json();
    const tool = data?.choices?.[0]?.message?.tool_calls?.[0];
    let score = 0; let tips: string[] = [];
    try {
      const parsed = JSON.parse(tool?.function?.arguments ?? "{}");
      score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
      tips = Array.isArray(parsed.tips) ? parsed.tips.filter((t: any) => typeof t === "string").slice(0, 6) : [];
    } catch (e) {
      console.error("Parse tool_calls failed", e);
    }
    const grade = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
    return new Response(JSON.stringify({ score, grade, tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-listing error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
