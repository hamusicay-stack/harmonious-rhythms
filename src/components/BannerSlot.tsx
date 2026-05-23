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
  const [loaded, setLoaded] = useState(false);

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
      if (isVip) query = query.eq("bypass_vip", true);
      const { data } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const b = data as Banner;
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
    <div
      className={`relative w-full h-fit flex justify-center items-center overflow-hidden my-4 rounded-lg bg-muted/30 transition-all duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      <span className="absolute end-2 top-2 z-10 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground backdrop-blur">
        פרסומת
      </span>
      <a
        href={banner.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block w-full transition-smooth hover:opacity-95"
        aria-label={banner.title}
      >
        <img
          src={banner.image_url}
          alt={banner.title}
          onLoad={() => setLoaded(true)}
          className="w-full max-w-full h-auto object-contain rounded-lg mx-auto"
          loading="lazy"
        />
      </a>
    </div>
  );
}
