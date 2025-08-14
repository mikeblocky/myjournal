import { http } from "../../lib/http";

// owner
export const list = (token, { page=1, limit=30, q="" } = {}) =>
  http(`/journals?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`, { token });

export const create = (token, payload) =>
  http("/journals", { method: "POST", token, body: payload });

export const getOne = (token, id) =>
  http(`/journals/${id}`, { token });

export const update = (token, id, payload) =>
  http(`/journals/${id}`, { method: "PUT", token, body: payload });

export const remove = (token, id) =>
  http(`/journals/${id}`, { method: "DELETE", token });

export const publish = (token, id) =>
  http(`/journals/${id}/publish`, { method: "POST", token });

export const unpublish = (token, id) =>
  http(`/journals/${id}/unpublish`, { method: "POST", token });

// public
export const listPublic = ({ page=1, limit=20, q="", tag="" } = {}) =>
  http(`/journals/public?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}`);

export const getPublic = (slug) =>
  http(`/journals/public/${encodeURIComponent(slug)}`);
