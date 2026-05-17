import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  bypass_vip: boolean;
};

export function BannerSlot({ position = "home_top", className }: { position?: string; className?: string }) {
  const { isVip } = useAuth();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from("ad_banners")
        .select("id, title, image_url, target_url, bypass_vip")
        .eq("position", position)
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`);
      // If the user is VIP, only fetch banners explicitly flagged to bypass VIP suppression.
      if (isVip) query = query.eq("bypass_vip", true);
      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const b = data as Banner;
      // Defensive double-check (in case of stale row): VIPs only see bypass ads.
      if (isVip && !b.bypass_vip) return;
      setBanner(b);
      supabase.rpc("track_banner_event", { _banner_id: b.id, _event_type: "view" });
    })();
    return () => { cancelled = true; };
  }, [position, isVip]);

  if (!banner) return null;

  const handleClick = () => {
    supabase.rpc("track_banner_event", { _banner_id: banner.id, _event_type: "click" });
  };

  return (
    <div className={`relative block w-full overflow-hidden my-4 rounded-lg border border-border/40 bg-muted/30 ${className ?? ""}`}>
      <span className="absolute right-2 top-2 z-10 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground backdrop-blur">
        פרסומת
      </span>
      <a
        href={banner.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block transition-smooth hover:opacity-95"
        aria-label={banner.title}
      >
        <img src={banner.image_url} alt={banner.title} className="h-auto w-full object-cover" loading="lazy" />
      </a>
    </div>
  );
}
