// Edge function: request password reset OTP
// Generates a 6-digit code, hashes & stores it, sends an email via Lovable email gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers: corsHeaders });
    }
    const lower = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if user exists (don't reveal — always return ok)
    const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = usersList?.users?.find((u) => (u.email ?? "").toLowerCase() === lower);

    if (user) {
      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const code_hash = await sha256(code);
      const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Invalidate previous unused
      await supabase.from("password_reset_otps")
        .update({ used_at: new Date().toISOString() })
        .eq("email", lower)
        .is("used_at", null);

      await supabase.from("password_reset_otps").insert({
        email: lower, code_hash, expires_at,
      });

      // Send email via Lovable email gateway (uses LOVABLE_API_KEY)
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        try {
          await fetch("https://ai.gateway.lovable.dev/v1/email/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${lovableKey}`,
            },
            body: JSON.stringify({
              to: lower,
              subject: "קוד איפוס סיסמה — המוזיקאי",
              html: `
                <div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;color:#111;">
                  <h2 style="margin:0 0 16px;color:#7c5a16">המוזיקאי</h2>
                  <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
                  <p>הקוד החד-פעמי שלך:</p>
                  <div style="font-size:32px;letter-spacing:8px;font-weight:800;text-align:center;background:#faf6ec;border:2px dashed #d4a24e;padding:18px;border-radius:12px;margin:16px 0;">
                    ${code}
                  </div>
                  <p style="color:#666;font-size:13px">הקוד תקף ל-15 דקות. אם לא ביקשת איפוס, אפשר להתעלם מההודעה.</p>
                </div>
              `,
            }),
          });
        } catch (e) {
          console.error("email send failed", e);
        }
      } else {
        // Dev fallback — log code
        console.log(`[dev] OTP for ${lower}: ${code}`);
      }
    }
    // Always return 200 (don't leak existence)
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: corsHeaders });
  }
});
