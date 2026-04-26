import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global like store for marketplace listings.
 * Keeps every card / detail page in sync when a like changes anywhere in the app.
 */
const likedSet = new Set<string>(); // current user's liked listing ids
const countMap = new Map<string, number>(); // listing_id -> total likes
const subscribers = new Map<string, Set<() => void>>();
let initializedForUser: string | null | undefined = undefined;

function notify(listingId: string) {
  subscribers.get(listingId)?.forEach((fn) => fn());
}

function setLikedLocal(listingId: string, liked: boolean, deltaCount = 0) {
  if (liked) likedSet.add(listingId); else likedSet.delete(listingId);
  if (deltaCount !== 0) {
    countMap.set(listingId, Math.max(0, (countMap.get(listingId) ?? 0) + deltaCount));
  }
  notify(listingId);
}

async function ensureUserLikesLoaded(userId: string | null) {
  if (initializedForUser === userId) return;
  initializedForUser = userId;
  likedSet.clear();
  if (!userId) { return; }
  const { data } = await supabase
    .from("marketplace_likes")
    .select("listing_id")
    .eq("user_id", userId);
  (data ?? []).forEach((r: any) => likedSet.add(r.listing_id));
  // Re-notify everyone currently subscribed
  for (const id of subscribers.keys()) notify(id);
}

export function useListingLike(listingId: string, initialCount?: number) {
  const { user } = useAuth();
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);

  // Seed count once if we got a server-known initial count
  useEffect(() => {
    if (initialCount != null && !countMap.has(listingId)) {
      countMap.set(listingId, initialCount);
    }
  }, [listingId, initialCount]);

  // Subscribe to changes for this listing
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    let set = subscribers.get(listingId);
    if (!set) { set = new Set(); subscribers.set(listingId, set); }
    set.add(fn);
    return () => {
      set?.delete(fn);
      if (set && set.size === 0) subscribers.delete(listingId);
    };
  }, [listingId]);

  // Load current user's likes once per user
  useEffect(() => {
    ensureUserLikesLoaded(user?.id ?? null);
  }, [user?.id]);

  const liked = likedSet.has(listingId);
  const count = countMap.get(listingId) ?? initialCount ?? 0;

  const toggle = useCallback(async () => {
    if (!user) { return { ok: false, reason: "auth" as const }; }
    if (busy) return { ok: false, reason: "busy" as const };
    setBusy(true);
    const wasLiked = likedSet.has(listingId);
    // Optimistic update — every subscriber re-renders instantly
    setLikedLocal(listingId, !wasLiked, wasLiked ? -1 : 1);
    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("marketplace_likes")
          .delete()
          .eq("listing_id", listingId)
          .eq("user_id", user.id);
        if (error) throw error;
        supabase.rpc("track_listing_event" as any, { _listing_id: listingId, _event_type: "unlike" });
      } else {
        const { error } = await supabase
          .from("marketplace_likes")
          .insert({ listing_id: listingId, user_id: user.id });
        // Ignore duplicate-key (already liked from another tab)
        if (error && (error as any).code !== "23505") throw error;
        supabase.rpc("track_listing_event" as any, { _listing_id: listingId, _event_type: "like" });
      }
      return { ok: true as const };
    } catch (e) {
      // Roll back optimistic change
      setLikedLocal(listingId, wasLiked, wasLiked ? 1 : -1);
      return { ok: false as const, reason: "error" as const, error: e };
    } finally {
      setBusy(false);
    }
  }, [user, listingId, busy]);

  return { liked, count, busy, toggle };
}
