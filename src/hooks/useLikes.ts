import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type LikeItemType =
  | "shop_product"
  | "academy_course"
  | "marketplace_listing"
  | "music_pro"
  | "forum_post";

/** Hook for a single item like state */
export function useLike(itemType: LikeItemType, itemId: string | undefined) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !itemId) { setLiked(false); return; }
    let cancelled = false;
    supabase
      .from("user_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setLiked(!!data); });
    return () => { cancelled = true; };
  }, [user, itemType, itemId]);

  const toggle = useCallback(async () => {
    if (!user) { toast.error("יש להתחבר כדי לסמן לייק"); return; }
    if (!itemId) return;
    setLoading(true);
    if (liked) {
      const { error } = await supabase
        .from("user_likes").delete()
        .eq("user_id", user.id).eq("item_type", itemType).eq("item_id", itemId);
      if (!error) setLiked(false);
      else toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_likes")
        .insert({ user_id: user.id, item_type: itemType, item_id: itemId });
      if (!error) setLiked(true);
      else if (!error.message.includes("duplicate")) toast.error(error.message);
    }
    setLoading(false);
  }, [user, itemType, itemId, liked]);

  return { liked, loading, toggle };
}
