import DOMPurify from "dompurify";

/**
 * Sanitize untrusted HTML before rendering with dangerouslySetInnerHTML.
 * Safe in SSR — falls back to stripping all tags when window is unavailable.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  if (typeof window === "undefined") {
    // SSR: strip all HTML tags as a conservative fallback
    return String(dirty).replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
  });
}
