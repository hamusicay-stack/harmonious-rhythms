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

/**
 * Forum sanitizer — adds support for inline images, YouTube embeds and audio/video players.
 * Only http(s) URLs and youtube.com/youtu.be embeds are allowed for iframes.
 */
export function sanitizeForumHtml(input: string): string {
  if (!input) return "";
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "b", "i",
      "h2", "h3", "h4",
      "ul", "ol", "li",
      "a", "blockquote", "code", "pre",
      "span", "div",
      "img", "figure", "figcaption",
      "iframe",
      "audio", "video", "source",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "dir", "class", "title",
      "src", "alt", "width", "height", "loading",
      "controls", "preload", "type",
      "frameborder", "allow", "allowfullscreen", "referrerpolicy",
      "data-type", "data-id", "data-label", "data-mention",
    ],
    ALLOWED_URI_REGEXP: /^(https?:\/\/|\/|data:image\/)/i,
    ALLOW_DATA_ATTR: false,
  });
  return clean;
}
