// frontend/src/features/digest/digest.api.js
import { http } from "../../lib/http";

export const getByDate = (token, date) =>
  http(`/digests/${date}`, { token });

export const generate = (token, date, { limit=12, refresh=false, length="detailed", topics="" } = {}) => {
  const qs = new URLSearchParams({
    date, limit: String(limit), refresh: String(!!refresh), length, ...(topics ? { topics } : {})
  });
  return http(`/digests/generate?${qs.toString()}`, { method: "POST", token }); // ✅ POST
};
