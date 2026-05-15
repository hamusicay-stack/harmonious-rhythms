import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicProfileBundle = Awaited<ReturnType<typeof getPublicProfile>>;

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ username: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    // 1) Find profile by username (must be public)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_url, banner_url, location, specialties, website, instagram, youtube, created_at, forum_post_count, forum_reputation, forum_rank, forum_signature, global_status, is_public_profile_active, global_subscription_tier_id",
      )
      .eq("username", data.username)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) return { profile: null as null, listings: [], shorts: [], topics: [], posts: [], musicPro: null as null, tier: null as null };
    if (!profile.is_public_profile_active || profile.global_status !== "active") {
      return { profile: { ...profile, restricted: true as const }, listings: [], shorts: [], topics: [], posts: [], musicPro: null as null, tier: null as null };
    }

    const userId = profile.id;

    // 2) Fan out concurrent queries
    const [listingsRes, shortsRes, topicsRes, postsRes, proRes, tierRes] = await Promise.all([
      supabaseAdmin
        .from("marketplace_listings")
        .select("id, title, price, currency, images, category, region, created_at")
        .eq("seller_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(24),
      supabaseAdmin
        .from("shorts_videos")
        .select("id, title, thumbnail_url, video_url, views_count, published_at")
        .eq("creator_id", userId)
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(24),
      supabaseAdmin
        .from("forum_topics")
        .select("id, title, slug, reply_count, view_count, created_at")
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("forum_posts")
        .select("id, body_md, created_at, topic:forum_topics(title, slug)")
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("music_pros")
        .select("id, display_name, headline, bio, profile_image, cover_image, region, specialties, genres, hourly_price_min, is_verified, is_featured")
        .eq("user_id", userId)
        .eq("status", "approved")
        .maybeSingle(),
      profile.global_subscription_tier_id
        ? supabaseAdmin
            .from("subscription_tiers")
            .select("id, slug, name, color, is_vip, rank")
            .eq("id", profile.global_subscription_tier_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      profile: { ...profile, restricted: false as const },
      listings: listingsRes.data ?? [],
      shorts: shortsRes.data ?? [],
      topics: topicsRes.data ?? [],
      posts: postsRes.data ?? [],
      musicPro: proRes.data ?? null,
      tier: tierRes.data ?? null,
    };
  });
