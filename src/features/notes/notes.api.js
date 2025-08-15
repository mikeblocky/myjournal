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

// Calendar sync functions
export const syncToCalendar = (token, { noteId, startTime="09:00", endTime="10:00", allDay=false, location="", color="" }) =>
  http("/notes/sync-to-calendar", { method: "POST", token, body: { noteId, startTime, endTime, allDay, location, color } });

export const syncDateToCalendar = (token, date, { startTime="09:00", endTime="10:00", allDay=false, location="", color="" }) =>
  http(`/notes/daily/${encodeURIComponent(date)}/sync-to-calendar`, { method: "POST", token, body: { startTime, endTime, allDay, location, color } });
