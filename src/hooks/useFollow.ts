import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FollowTargetType = "user" | "marketplace_seller" | "music_pro" | "shorts_creator";

export function useFollow(targetType: FollowTargetType, targetId: string | undefined) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetId) { setFollowing(false); return; }
    let cancelled = false;
    supabase.from("user_follows").select("id")
      .eq("follower_id", user.id).eq("target_type", targetType).eq("target_id", targetId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setFollowing(!!data); });
    return () => { cancelled = true; };
  }, [user, targetType, targetId]);

  const toggle = useCallback(async () => {
    if (!user) { toast.error("יש להתחבר כדי לעקוב"); return; }
    if (!targetId) return;
    if (user.id === targetId && targetType === "user") { toast.info("אי אפשר לעקוב אחרי עצמך"); return; }
    setLoading(true);
    if (following) {
      const { error } = await supabase.from("user_follows").delete()
        .eq("follower_id", user.id).eq("target_type", targetType).eq("target_id", targetId);
      if (!error) { setFollowing(false); toast.success("הוסר מעקב"); }
      else toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_follows")
        .insert({ follower_id: user.id, target_type: targetType, target_id: targetId });
      if (!error) { setFollowing(true); toast.success("עוקב!"); }
      else if (!error.message.includes("duplicate")) toast.error(error.message);
    }
    setLoading(false);
  }, [user, targetType, targetId, following]);

  return { following, loading, toggle };
}
