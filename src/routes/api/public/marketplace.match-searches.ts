import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Called by pg_cron every 15 minutes. Scans new approved listings against
// users' saved searches and enqueues email notifications for matches.
export const Route = createFileRoute("/api/public/marketplace/match-searches")({
  server: {
    handlers: {
      POST: async () => {
        try {
          // 1. Load all saved searches that want email notifications
          const { data: searches, error: sErr } = await supabaseAdmin
            .from("marketplace_saved_searches")
            .select("id, user_id, name, filters, last_notified_at, notify_email")
            .eq("notify_email", true);

          if (sErr) throw sErr;
          if (!searches || searches.length === 0) {
            return Response.json({ ok: true, processed: 0, matches: 0 });
          }

          // 2. Load recent approved listings (last 24h max — pg_cron runs often)
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: listings, error: lErr } = await supabaseAdmin
            .from("marketplace_listings")
            .select("id, title, category, subcategory, brand, city, item_condition, price, images, created_at, seller_id")
            .eq("status", "approved")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(500);

          if (lErr) throw lErr;
          if (!listings || listings.length === 0) {
            return Response.json({ ok: true, processed: searches.length, matches: 0 });
          }

          let matchCount = 0;

          // 3. For each search, find matching listings created after last_notified_at
          for (const search of searches) {
            const filters = (search.filters || {}) as Record<string, any>;
            const cutoff = search.last_notified_at
              ? new Date(search.last_notified_at).getTime()
              : new Date(search.created_at || since).getTime();

            const matches = listings.filter((l) => {
              // Don't notify users about their own listings
              if (l.seller_id === search.user_id) return false;
              if (new Date(l.created_at).getTime() <= cutoff) return false;

              if (filters.categories?.length && !filters.categories.includes(l.category)) return false;
              if (filters.subcategories?.length && (!l.subcategory || !filters.subcategories.includes(l.subcategory))) return false;
              if (filters.brands?.length && (!l.brand || !filters.brands.includes(l.brand))) return false;
              if (filters.cities?.length && (!l.city || !filters.cities.includes(l.city))) return false;
              if (filters.conditions?.length && !filters.conditions.includes(l.item_condition)) return false;
              if (filters.minPrice && l.price < Number(filters.minPrice)) return false;
              if (filters.maxPrice && l.price > Number(filters.maxPrice)) return false;
              if (filters.search) {
                const q = String(filters.search).toLowerCase();
                const hay = `${l.title} ${l.brand ?? ""} ${l.category}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            });

            if (matches.length === 0) continue;

            // 4. Get user email
            const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(search.user_id);
            const email = userInfo?.user?.email;
            if (!email) continue;

            // 5. Build email HTML
            const top = matches.slice(0, 5);
            const baseUrl = process.env.SUPABASE_URL?.includes("localhost")
              ? "http://localhost:3000"
              : "https://hamusicay.com";

            const itemsHtml = top
              .map((l) => {
                const img = l.images?.[0] || "";
                const url = `${baseUrl}/marketplace/${l.id}`;
                return `
                  <tr>
                    <td style="padding:12px;border-bottom:1px solid #eee;">
                      ${img ? `<img src="${img}" alt="" width="80" style="border-radius:8px;display:block;" />` : ""}
                    </td>
                    <td style="padding:12px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">
                      <a href="${url}" style="color:#111;text-decoration:none;font-weight:600;font-size:16px;">${escapeHtml(l.title)}</a><br/>
                      <span style="color:#666;font-size:14px;">${l.brand ? escapeHtml(l.brand) + " · " : ""}${l.city ? escapeHtml(l.city) : ""}</span><br/>
                      <span style="color:#0a7;font-weight:700;font-size:16px;">₪${Number(l.price).toLocaleString("he-IL")}</span>
                    </td>
                  </tr>`;
              })
              .join("");

            const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he"><body style="margin:0;padding:24px;background:#f6f7f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    <tr><td style="padding:20px 24px;background:#111;color:#fff;">
      <h1 style="margin:0;font-size:20px;">🔔 הסוכן החכם שלך מצא ${matches.length} מודעות חדשות</h1>
      <p style="margin:6px 0 0;opacity:.8;font-size:14px;">חיפוש שמור: ${escapeHtml(search.name)}</p>
    </td></tr>
    <tr><td><table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table></td></tr>
    <tr><td style="padding:20px 24px;text-align:center;">
      <a href="${baseUrl}/marketplace" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">צפה בכל ההתאמות</a>
    </td></tr>
    <tr><td style="padding:16px 24px;color:#999;font-size:12px;text-align:center;border-top:1px solid #eee;">
      קיבלת מייל זה כי שמרת חיפוש "המוזיקאי". <a href="${baseUrl}/profile" style="color:#999;">ניהול חיפושים</a>
    </td></tr>
  </table>
</body></html>`;

            // 6. Enqueue email
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: email,
                subject: `🔔 ${matches.length} מודעות חדשות תואמות לחיפוש "${search.name}"`,
                html,
                template_name: "saved_search_match",
              },
            });

            // 7. Update last_notified_at
            await supabaseAdmin
              .from("marketplace_saved_searches")
              .update({ last_notified_at: new Date().toISOString() })
              .eq("id", search.id);

            matchCount += matches.length;
          }

          return Response.json({ ok: true, processed: searches.length, matches: matchCount });
        } catch (err: any) {
          console.error("match-searches error:", err);
          return Response.json({ ok: false, error: err?.message || "unknown" }, { status: 500 });
        }
      },
    },
  },
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
