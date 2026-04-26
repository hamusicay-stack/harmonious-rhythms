import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content from rich-text editors before rendering.
 * Allows only safe inline formatting tags (no scripts, no inline event handlers).
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "b", "i",
      "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "blockquote", "code", "pre",
      "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "dir", "class"],
    ALLOW_DATA_ATTR: false,
  });
}
