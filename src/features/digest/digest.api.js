import { http } from "../../lib/http";

export const getByDate = (token, dateYmd) =>
  http(`/digests/${dateYmd}`, { token });

export const generate = (token, dateYmd, { limit=12, refresh=false, length="detailed" } = {}) => {
  const q = new URLSearchParams({
    date: dateYmd,
    limit: String(limit),
    refresh: String(refresh),
    length
  });
  return http(`/digests/generate?${q.toString()}`, { method: "POST", token });
};
