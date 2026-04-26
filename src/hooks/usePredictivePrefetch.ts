import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * usePredictivePrefetch — throttled hover-dwell prefetcher
 * Manifesto: only prefetch when pointer dwells > 100ms over a link.
 * Avoids flooding the server on fast cursor sweeps.
 */
export function usePredictivePrefetch(dwellMs = 100) {
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const fetched = useRef<Set<string>>(new Set());

  useEffect(() => {
    function findHref(el: EventTarget | null): string | null {
      let node = el as HTMLElement | null;
      while (node && node !== document.body) {
        if (node.tagName === "A") {
          const href = (node as HTMLAnchorElement).getAttribute("href");
          if (href && href.startsWith("/") && !href.startsWith("//")) return href;
        }
        node = node.parentElement;
      }
      return null;
    }

    function onOver(e: Event) {
      const href = findHref(e.target);
      if (!href || fetched.current.has(href)) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fetched.current.add(href);
        router.preloadRoute({ to: href as never }).catch(() => {});
      }, dwellMs);
    }

    function onOut() {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    }

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [router, dwellMs]);
}
