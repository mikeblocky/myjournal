// frontend/src/features/ai/ai.api.js
import { http } from "../../lib/http";

const ALLOWED = new Set(["tldr", "detailed", "outline"]);
const MAX_INPUT_CHARS = 8000; // keep in sync with backend cap if you change it

function pickMode(mode) {
  return ALLOWED.has(mode) ? mode : "detailed";
}

function stripHtml(s = "") {
  return String(s).replace(/<[^>]+>/g, " ");
}
function compress(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}
function cleanText(s = "") {
  return compress(stripHtml(s)).slice(0, MAX_INPUT_CHARS);
}

/**
 * Core summarize call.
 * Pass either { articleId } or { text }.
 */
export async function summarize(token, { text, articleId, mode = "detailed" } = {}) {
  const body = { mode: pickMode(mode) };

  if (text) body.text = cleanText(text);
  if (articleId) body.articleId = articleId;

  if (!body.text && !body.articleId) {
    throw new Error("summarize() requires text or articleId");
  }

  const res = await http("/ai/summarize", {
    method: "POST",
    token,
    body
  });

  return { summary: compress(res?.summary || "") };
}

/** Convenience: summarize by article id only */
export const summarizeById = (token, id, mode = "detailed") =>
  summarize(token, { articleId: id, mode });

/** Convenience: summarize from HTML + (optional) title/excerpt */
export function summarizeHTML(token, { html, title, excerpt, mode = "detailed" }) {
  const txt = cleanText(html || "") || compress(`${title || ""}. ${excerpt || ""}`);
  return summarize(token, { text: txt, mode });
}
