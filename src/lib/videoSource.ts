// Video source helpers — YouTube / Google Drive / Direct Storage
export type VideoSourceType = "youtube" | "google_drive" | "direct";

export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function extractGoogleDriveId(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim();
  const m1 = v.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = v.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

/**
 * Resolves a saved set's video into a renderable form.
 * Returns either an iframe URL (YouTube / Drive embed) or a direct media URL for <video>.
 */
export function resolveVideoEmbed(
  sourceType: VideoSourceType | string | null | undefined,
  url: string | null | undefined,
  fallbackYoutubeId?: string | null,
): { kind: "iframe" | "video"; src: string } | null {
  const type = (sourceType ?? "youtube") as VideoSourceType;

  if (type === "youtube") {
    const id = extractYouTubeId(url) || (fallbackYoutubeId ?? null);
    if (!id) return null;
    return { kind: "iframe", src: `https://www.youtube.com/embed/${id}?rel=0` };
  }

  if (type === "google_drive") {
    const id = extractGoogleDriveId(url);
    if (!id) return null;
    return { kind: "iframe", src: `https://drive.google.com/file/d/${id}/preview` };
  }

  if (type === "direct") {
    if (!url) return null;
    return { kind: "video", src: url };
  }

  return null;
}
