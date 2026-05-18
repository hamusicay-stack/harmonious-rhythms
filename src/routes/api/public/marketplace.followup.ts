import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Public cron endpoint: scans approved listings older than `followup_days`
// and enqueues a follow-up email to the seller asking if the item was sold.
export const Route = createFileRoute("/api/public/marketplace/followup")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }
        const supabase = createClient(supabaseUrl, serviceKey);

        // Read settings
        const { data: settings } = await supabase
          .from("marketplace_settings")
          .select("followup_days, followup_enabled")
          .eq("id", 1)
          .maybeSingle();

        if (!settings?.followup_enabled) {
          return Response.json({ skipped: true, reason: "disabled" });
        }
        const days = Math.max(1, settings.followup_days ?? 30);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Find approved listings older than cutoff that haven't been notified
        const { data: listings, error } = await supabase
          .from("marketplace_listings")
          .select("id, title, seller_id, created_at")
          .eq("status", "approved")
          .is("followup_sent_at", null)
          .lte("created_at", cutoff)
          .limit(50);

        if (error) {
          console.error("Failed to query listings", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        if (!listings?.length) {
          return Response.json({ processed: 0 });
        }

        // Get seller emails
        const sellerIds = Array.from(new Set(listings.map((l) => l.seller_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", sellerIds);
        const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

        let processed = 0;
        for (const listing of listings) {
          const profile = profMap.get(listing.seller_id);
          if (!profile?.email) continue;

          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #1a1a1a;">שלום ${profile.display_name ?? "מוכר יקר"},</h2>
              <p>המודעה שלך "<strong>${listing.title}</strong>" פורסמה בלוח יד 2 שלנו לפני ${days} יום.</p>
              <p>האם הפריט עדיין למכירה? אם כן — מומלץ לעדכן את המודעה כדי שתחזור לראש הרשימה.</p>
              <p>אם הפריט נמכר, תוכל למחוק את המודעה דרך הפרופיל שלך.</p>
              <p style="margin-top: 30px; color: #666;">בהצלחה,<br/>צוות המוזיקאי</p>
            </div>
          `;

          // Try to enqueue via existing email infrastructure
          const { error: enqError } = await supabase.rpc("enqueue_email" as any, {
            queue_name: "transactional_emails",
            payload: {
              to: profile.email,
              subject: `המודעה שלך "${listing.title}" — האם נמכרה?`,
              html,
              label: "marketplace_followup",
              queued_at: new Date().toISOString(),
              message_id: `mp-followup-${listing.id}`,
              idempotency_key: `mp-followup-${listing.id}`,
            },
          });

          // Mark as sent regardless (avoid retry loops if email infra not configured)
          await supabase
            .from("marketplace_listings")
            .update({ followup_sent_at: new Date().toISOString() })
            .eq("id", listing.id);

          if (!enqError) processed++;
          else console.warn("enqueue_email failed for listing", listing.id, enqError);
        }

        return Response.json({ processed, total: listings.length, days });
      },
    },
  },
});
