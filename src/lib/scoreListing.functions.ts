import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  price: z.union([z.number(), z.string()]).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  year: z.union([z.number(), z.string()]).optional(),
  item_condition: z.string().trim().max(60).optional(),
  images_count: z.number().int().min(0).max(50).optional(),
  has_audio: z.boolean().optional(),
  has_video: z.boolean().optional(),
  city: z.string().trim().max(120).optional(),
});

type ScoreOutput = { score: number; grade: "low" | "medium" | "high"; tips: string[]; error?: string };

const SYSTEM_PROMPT = `אתה מומחה למכירות יד שניה של כלי נגינה וציוד מוזיקלי בישראל.
המטרה שלך: לתת ציון אטרקטיביות 0-100 למודעה ולהציע 3-5 שיפורים קצרים ומעשיים.

קריטריונים:
- כותרת ברורה עם מותג + דגם (משקל גבוה)
- תיאור ארוך ומפורט (אורך, מצב פיזי, סיבת מכירה, אביזרים)
- מספר ומגוון תמונות (אופטימלי 5+)
- אודיו/וידאו דמו = בונוס משמעותי (במיוחד לכלים)
- מחיר הגיוני לקטגוריה
- ציון מצב, שנה, ומיקום
החזר ציון מספרי בלבד וטיפים בעברית, קצרים, ממוקדים, וניתנים ליישום מיידי.`;

/**
 * Server-side AI scoring for marketplace listings.
 * Migrated from supabase/functions/score-listing → TanStack server fn.
 */
export const scoreListing = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ScoreOutput> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { score: 0, grade: "low", tips: [], error: "LOVABLE_API_KEY not configured" };
    }

    const summary = [
      `כותרת: ${data.title ?? "(חסר)"}`,
      `תיאור: ${data.description ?? "(חסר)"}`,
      `קטגוריה: ${data.category ?? "(חסר)"}`,
      `יצרן/דגם: ${data.brand ?? "?"} ${data.model ?? ""}`.trim(),
      `שנה: ${data.year ?? "(לא צוין)"}`,
      `מצב: ${data.item_condition ?? "(לא צוין)"}`,
      `מחיר: ${data.price ?? "(לא צוין)"} ש"ח`,
      `מספר תמונות: ${data.images_count ?? 0}`,
      `אודיו: ${data.has_audio ? "כן" : "לא"}`,
      `סרטון: ${data.has_video ? "כן" : "לא"}`,
      `עיר: ${data.city ?? "(לא צוין)"}`,
    ].join("\n");

    try {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
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
                  score: { type: "integer", minimum: 0, maximum: 100 },
                  tips: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
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
        if (aiResp.status === 429) return { score: 0, grade: "low", tips: [], error: "Rate limit — נסה שוב בעוד רגע." };
        if (aiResp.status === 402) return { score: 0, grade: "low", tips: [], error: "נדרש תשלום ב-Lovable AI." };
        const t = await aiResp.text();
        console.error("scoreListing AI error", aiResp.status, t);
        return { score: 0, grade: "low", tips: [], error: "AI scoring failed" };
      }

      const json = await aiResp.json();
      const tool = json?.choices?.[0]?.message?.tool_calls?.[0];
      let score = 0;
      let tips: string[] = [];
      try {
        const parsed = JSON.parse(tool?.function?.arguments ?? "{}");
        score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
        tips = Array.isArray(parsed.tips)
          ? parsed.tips.filter((s: unknown) => typeof s === "string").slice(0, 6)
          : [];
      } catch (e) {
        console.error("scoreListing parse failed", e);
      }
      const grade: ScoreOutput["grade"] = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
      return { score, grade, tips };
    } catch (e) {
      console.error("scoreListing failed", e);
      return { score: 0, grade: "low", tips: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
