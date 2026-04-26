import { useEffect, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

/**
 * Tracks scroll direction with a threshold to avoid jitter.
 * Used by SiteHeader for smart hide-on-scroll.
 */
export function useScrollDirection(threshold = 80) {
  const [direction, setDirection] = useState<ScrollDirection>("idle");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const diff = y - lastY;

      if (Math.abs(diff) < 6) {
        ticking = false;
        return;
      }

      if (y < threshold) {
        setDirection("idle");
      } else if (diff > 0) {
        setDirection("down");
      } else {
        setDirection("up");
      }

      setScrollY(y);
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { direction, scrollY };
}
