// Edge function: verify OTP + set new password.
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
    const { email, code, new_password } = await req.json();
    if (!email || !code || !new_password || String(new_password).length < 6) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: corsHeaders });
    }
    const lower = String(email).trim().toLowerCase();
    const code_hash = await sha256(String(code).trim());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows } = await supabase
      .from("password_reset_otps")
      .select("*")
      .eq("email", lower)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) {
      return new Response(JSON.stringify({ error: "code_invalid" }), { status: 400, headers: corsHeaders });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "code_expired" }), { status: 400, headers: corsHeaders });
    }
    if ((row.attempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "too_many_attempts" }), { status: 429, headers: corsHeaders });
    }
    if (row.code_hash !== code_hash) {
      await supabase.from("password_reset_otps").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "code_invalid" }), { status: 400, headers: corsHeaders });
    }

    // Find user and update password
    const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = usersList?.users?.find((u) => (u.email ?? "").toLowerCase() === lower);
    if (!user) {
      return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404, headers: corsHeaders });
    }
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: String(new_password),
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: corsHeaders });
    }
    await supabase.from("password_reset_otps").update({ used_at: new Date().toISOString() }).eq("id", row.id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: corsHeaders });
  }
});
