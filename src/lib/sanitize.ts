import DOMPurify from "dompurify";

/**
 * Sanitize untrusted HTML before rendering with dangerouslySetInnerHTML.
 * Safe in SSR — falls back to stripping all tags when window is unavailable.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  if (typeof window === "undefined") {
    return String(dirty).replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  });
}

/**
 * Stricter sanitizer for forum / user-generated rich text.
 * Allows a conservative tag set suitable for posts and replies.
 */
export function sanitizeForumHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  if (typeof window === "undefined") {
    return String(dirty).replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
      "blockquote", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4",
      "span", "img", "hr",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "class"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onfocus",
      "onblur", "onchange", "onsubmit",
    ],
  });
}
