import { http } from "../../lib/http";

export const signup = (email, password, name="") =>
  http("/auth/signup", { method: "POST", body: { email, password, name } });

export const login = (email, password) =>
  http("/auth/login", { method: "POST", body: { email, password } });

export const me = (token) =>
  http("/auth/me", { headers: {}, token });
