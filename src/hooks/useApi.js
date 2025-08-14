import { useAuth } from "../context/AuthContext";
import { http } from "../lib/http";

export function useApi() {
  const { token } = useAuth();
  return (path, opts = {}) => http(path, { ...opts, token });
}
