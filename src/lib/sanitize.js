import DOMPurify from "dompurify";

// one-time hooks
let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // open article links in new tab
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    // images: remove hard widths, lazy-load
    if (node.tagName === "IMG") {
      node.removeAttribute("width");
      node.removeAttribute("height");
      node.setAttribute("loading", "lazy");
      node.style && node.removeAttribute("style");
    }
  });
}

export function sanitizeArticle(html) {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "noscript"],
    FORBID_ATTR: ["style"], // strip inline styles to avoid pasted look
    ALLOW_UNKNOWN_PROTOCOLS: false,
    USE_PROFILES: { html: true }
  });
}
