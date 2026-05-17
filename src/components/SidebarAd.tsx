import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
};

interface Props {
  /** "left" → sticks to viewport left; "right" → sticks to viewport right (RTL primary). */
  side: "left" | "right";
  /** Banner DB position key (e.g. sidebar_right). */
  position: string;
}

const STORAGE_KEY = (side: string) => `sidebar_ad_dismissed_${side}`;

/**
 * Discreet sidebar ad — fixed on the side of the viewport, only on large screens.
 * - Hidden completely on screens narrower than `xl` so it never covers content.
 * - Dismissible per session (saved in sessionStorage).
 * - Clearly tagged "פרסומת" for transparency.
 */
export function SidebarAd({ side, position }: Props) {
  const { isVip } = useAuth();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isVip) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY(side))) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ad_banners")
        .select("id, title, image_url, target_url")
        .eq("position", position)
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setBanner(data as Banner);
      supabase.rpc("track_banner_event" as any, { _banner_id: data.id, _event_type: "view" });
    })();
    return () => { cancelled = true; };
  }, [position, side, isVip]);

  const onDismiss = () => {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY(side), "1");
  };
  const onClick = () => {
    if (banner) supabase.rpc("track_banner_event" as any, { _banner_id: banner.id, _event_type: "click" });
  };

  if (isVip) return null;
  if (!banner || dismissed) return null;

  // Position: hidden below xl (1280px), narrow column on the side, vertically centered.
  const sideClass =
    side === "right"
      ? "right-2 2xl:right-4"
      : "left-2 2xl:left-4";

  return (
    <aside
      className={`pointer-events-none fixed top-1/2 z-30 hidden -translate-y-1/2 xl:block ${sideClass}`}
      aria-label="פרסומת"
    >
      <div className="pointer-events-auto group relative w-[160px] overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur shadow-soft">
        {/* Sponsored badge */}
        <span className="absolute right-1.5 top-1.5 z-10 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          פרסומת
        </span>
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute left-1.5 top-1.5 z-10 rounded-full bg-background/90 p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
          aria-label="סגור פרסומת"
        >
          <X className="h-3 w-3" />
        </button>
        <a
          href={banner.target_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className="block transition hover:opacity-90"
          aria-label={banner.title}
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="h-auto w-full object-cover"
            loading="lazy"
          />
          <div className="border-t border-border/40 px-2 py-1.5 text-[10px] text-muted-foreground line-clamp-2">
            {banner.title}
          </div>
        </a>
      </div>
    </aside>
  );
}
