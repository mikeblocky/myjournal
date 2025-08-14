import { http } from "../../lib/http";

export const listRange = (token, { start, end, q = "" }) =>
  http(`/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&q=${encodeURIComponent(q)}`, { token });

export const create = (token, payload) =>
  http("/calendar", { method: "POST", token, body: payload });

export const update = (token, id, payload) =>
  http(`/calendar/${id}`, { method: "PUT", token, body: payload });

export const remove = (token, id) =>
  http(`/calendar/${id}`, { method: "DELETE", token });

export const getDaily = (token, date) =>
  http(`/calendar/daily/${encodeURIComponent(date)}`, { token });

export const generateDaily = (token, date) =>
  http(`/calendar/daily/${encodeURIComponent(date)}/generate`, { method: "POST", token });
