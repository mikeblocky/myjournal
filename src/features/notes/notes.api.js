import { http } from "../../lib/http";

export const list = (token, { date="", page=1, limit=100, q="" } = {}) =>
  http(`/notes?date=${encodeURIComponent(date)}&page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`, { token });

export const create = (token, payload) =>
  http("/notes", { method: "POST", token, body: payload });

export const update = (token, id, payload) =>
  http(`/notes/${id}`, { method: "PUT", token, body: payload });

export const remove = (token, id) =>
  http(`/notes/${id}`, { method: "DELETE", token });

export const getDaily = (token, date) =>
  http(`/notes/daily/${encodeURIComponent(date)}`, { token });

export const generateDaily = (token, date) =>
  http(`/notes/daily/${encodeURIComponent(date)}/generate`, { method: "POST", token });
