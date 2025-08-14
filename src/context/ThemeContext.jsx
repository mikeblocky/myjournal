import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || (prefersDark ? "dark" : "light"));

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggle: () => setTheme(t => (t === "light" ? "dark" : "light")),
    setTheme
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
