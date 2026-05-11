// Helpers for normalizing audio URLs from various sources (Google Drive, Dropbox, etc.)
// so they can be used directly as <audio src="..."> in the browser.

const DRIVE_FILE_RE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]{10,})/;
const DRIVE_FOLDER_RE = /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/;

/** Convert a Google Drive share/view URL to a direct download URL playable as audio. */
export function normalizeAudioUrl(input: string | null | undefined): string {
  if (!input) return "";
  const v = input.trim();
  if (!v) return "";

  // Already a direct/host URL
  if (DRIVE_FOLDER_RE.test(v)) return v; // folder — can't auto-play

  const m = v.match(DRIVE_FILE_RE);
  if (m) {
    // Use the uc?export=download endpoint which serves the raw file (best for short audio).
    return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }

  // Dropbox share URL → direct
  if (/dropbox\.com\/.+\?dl=0/.test(v)) return v.replace("?dl=0", "?raw=1");

  return v;
}

/** Returns true if the URL looks like a Drive share URL we know how to convert. */
export function isDriveShareUrl(input: string | null | undefined): boolean {
  return !!input && DRIVE_FILE_RE.test(input);
}
