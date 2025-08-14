// frontend/src/features/articles/articles.api.js
import { http } from "../../lib/http";

export const importByUrl = (token, url, tags = []) =>
  http("/articles/import", { method: "POST", token, body: { url, tags } });

export const list = (token, { page = 1, limit = 30, q = "", tag = "" } = {}) =>
  http(
    `/articles?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}`,
    { token }
  );

export const getOne = (token, id) =>
  http(`/articles/${id}`, { token });

export const update = (token, id, body) =>
  http(`/articles/${id}`, { method: "PUT", token, body });

export const refresh = (
  token,
  limit = 60,
  force = true,
  params = { topics: "world,business,tech,science,social,school,student" }
) => {
  const qs = new URLSearchParams({
    limit: String(limit),
    force: String(!!force),
    ...(params.topics ? { topics: params.topics } : {})
  });
  return http(`/articles/refresh?${qs.toString()}`, { method: "POST", token });
};
