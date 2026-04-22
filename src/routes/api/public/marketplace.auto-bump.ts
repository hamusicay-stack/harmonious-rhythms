import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Daily cron: auto-bump all listings owned by active business sellers
// for another 24h. Called from pg_cron.
export const Route = createFileRoute("/api/public/marketplace/auto-bump")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { data: business, error: bErr } = await supabaseAdmin
            .from("marketplace_business_sellers")
            .select("user_id")
            .eq("subscription_status", "active");
          if (bErr) throw bErr;

          const userIds = (business ?? []).map((b: { user_id: string }) => b.user_id);
          if (userIds.length === 0) {
            return Response.json({ ok: true, bumped: 0, message: "No active business sellers" });
          }

          const now = new Date();
          const expires = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

          const { data: updated, error: uErr } = await supabaseAdmin
            .from("marketplace_listings")
            .update({ bumped_at: now.toISOString(), bump_expires_at: expires })
            .eq("status", "approved")
            .in("seller_id", userIds)
            .select("id");
          if (uErr) throw uErr;

          return Response.json({ ok: true, bumped: updated?.length ?? 0 });
        } catch (e) {
          const message = e instanceof Error ? e.message : "unknown error";
          console.error("auto-bump error:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
