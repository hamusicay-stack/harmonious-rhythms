import { useEffect, useState } from "react";
import { cacheVideo, getCachedBlob } from "@/lib/shorts-cache";

/**
 * Returns a `blob:` URL when the video is already in IndexedDB, otherwise
 * the original URL. Also schedules a background fetch+cache write so the
 * NEXT session loads from local storage instantly.
 */
export function useCachedVideoUrl(url: string | null | undefined) {
  const [resolved, setResolved] = useState<string | null>(url ?? null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    if (!url) { setResolved(null); return; }
    setResolved(url);

    void getCachedBlob(url).then((blob) => {
      if (cancelled) return;
      if (blob) {
        const obj = URL.createObjectURL(blob);
        revoke = obj;
        setResolved(obj);
      } else {
        // Defer the cache write so first-play network isn't slowed.
        const t = window.setTimeout(() => { void cacheVideo(url); }, 3000);
        return () => window.clearTimeout(t);
      }
    });

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url]);

  return resolved;
}
