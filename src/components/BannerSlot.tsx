import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
};

export function BannerSlot({ position = "home_top", className }: { position?: string; className?: string }) {
  const { isVip } = useAuth();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (isVip) return;
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
  }, [position, isVip]);

  if (isVip) return null;
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
