import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { storage } from "../lib/storage";
import * as api from "../features/auth/auth.api";

const AuthContext = createContext({
  token: "", user: null, loading: false,
  login: async () => {}, signup: async () => {}, logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.get("token", ""));
  const [user, setUser] = useState(() => storage.get("user", null));
  const [loading, setLoading] = useState(false);

  useEffect(() => { storage.set("token", token); }, [token]);
  useEffect(() => { storage.set("user", user); }, [user]);

  useEffect(() => {
    if (!token || user) return;
    api.me(token).then(({ user }) => setUser(user)).catch(() => setToken(""));
  }, [token]); // fetch /me once

  const value = useMemo(() => ({
    token, user, loading,
    login: async (email, password) => {
      setLoading(true);
      try {
        const { token, user } = await api.login(email, password);
        setToken(token); setUser(user);
      } finally { setLoading(false); }
    },
    signup: async (email, password, name) => {
      setLoading(true);
      try {
        const { token, user } = await api.signup(email, password, name);
        setToken(token); setUser(user);
      } finally { setLoading(false); }
    },
    logout: () => { setToken(""); setUser(null); }
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
