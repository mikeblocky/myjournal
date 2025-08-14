import { http } from "../../lib/http";
export const summarize = (token, { text, articleId, mode = "tldr" }) =>
  http("/ai/summarize", { method: "POST", token, body: { text, articleId, mode } });
