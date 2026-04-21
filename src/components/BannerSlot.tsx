import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
};

export function BannerSlot({ position = "home_top", className }: { position?: string; className?: string }) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ad_banners")
        .select("id, title, image_url, target_url")
        .eq("position", position)
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setBanner(data as Banner);
      supabase.rpc("track_banner_event", { _banner_id: data.id, _event_type: "view" });
    })();
    return () => { cancelled = true; };
  }, [position]);

  if (!banner) return null;

  const handleClick = () => {
    supabase.rpc("track_banner_event", { _banner_id: banner.id, _event_type: "click" });
  };

  return (
    <a
      href={banner.target_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={handleClick}
      className={`block overflow-hidden rounded-xl border border-border/40 transition-smooth hover:opacity-95 ${className ?? ""}`}
      aria-label={banner.title}
    >
      <img src={banner.image_url} alt={banner.title} className="h-auto w-full object-cover" loading="lazy" />
    </a>
  );
}
