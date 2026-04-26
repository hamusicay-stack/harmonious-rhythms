// Imports product data from an external URL using Lovable AI (Gemini)
// and uploads images to Supabase Storage. Returns a draft product object.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "he,en;q=0.8",
};

function stripScripts(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
}

function absoluteUrl(maybe: string, base: string) {
  try {
    return new URL(maybe, base).toString();
  } catch {
    return null;
  }
}

async function uploadImageFromUrl(imgUrl: string, baseUrl: string): Promise<string | null> {
  try {
    const abs = absoluteUrl(imgUrl, baseUrl);
    if (!abs) return null;
    const res = await fetch(abs, { headers: { "User-Agent": FETCH_HEADERS["User-Agent"], Referer: baseUrl } });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1000 || buf.byteLength > 12 * 1024 * 1024) return null;
    const ext = ct.split("/")[1].split(";")[0].replace("jpeg", "jpg") || "jpg";
    const path = `imported/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await admin.storage.from("shop-products").upload(path, buf, { contentType: ct, upsert: false });
    if (error) {
      console.error("storage upload error", error);
      return null;
    }
    const { data } = admin.storage.from("shop-products").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadImageFromUrl failed", e);
    return null;
  }
}

async function callAI(html: string, sourceUrl: string) {
  const truncated = html.slice(0, 60000); // keep prompt manageable
  const body = {
    messages: [
      {
        role: "system",
        content:
          "אתה מחלץ נתוני מוצר מ-HTML של עמודי חנות. החזר JSON בעברית כשאפשר. כלול כותרת, תיאור קצר ומלא, מחיר במספרים בלבד (ILS), מותג, דגם, ועד 8 כתובות תמונה איכותיות (URL מלאים, לא thumbnails).",
      },
      {
        role: "user",
        content: `URL מקור: ${sourceUrl}\n\nHTML:\n${truncated}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extract_product",
          description: "Extract structured product data",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              short_description: { type: "string" },
              description: { type: "string" },
              price: { type: "number" },
              sale_price: { type: ["number", "null"] },
              currency: { type: "string" },
              brand: { type: "string" },
              model: { type: "string" },
              sku: { type: "string" },
              images: { type: "array", items: { type: "string" }, maxItems: 8 },
            },
            required: ["title"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extract_product" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", ...body }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t}`);
  }

  const json = await resp.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call returned");
  return JSON.parse(call.function.arguments);
}

async function importOne(url: string) {
  const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = stripScripts(await res.text());

  const extracted = await callAI(html, url);
  const imgs: string[] = Array.isArray(extracted.images) ? extracted.images.slice(0, 8) : [];
  const uploaded: string[] = [];
  for (const u of imgs) {
    const stored = await uploadImageFromUrl(u, url);
    if (stored) uploaded.push(stored);
    if (uploaded.length >= 6) break;
  }

  return {
    source_url: url,
    title: extracted.title ?? "",
    short_description: extracted.short_description ?? "",
    description: extracted.description ?? "",
    price: Number(extracted.price) || 0,
    sale_price: extracted.sale_price ?? null,
    currency: extracted.currency || "ILS",
    brand: extracted.brand ?? "",
    model: extracted.model ?? "",
    sku: extracted.sku ?? "",
    main_image: uploaded[0] ?? null,
    gallery: uploaded,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (urls.length > 10) {
      return new Response(JSON.stringify({ error: "Max 10 URLs per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      urls.map(async (u: string) => {
        try {
          const data = await importOne(u);
          return { ok: true, url: u, data };
        } catch (e) {
          console.error("import failed", u, e);
          return { ok: false, url: u, error: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
