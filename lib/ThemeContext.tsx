"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Read saved preference on first load
  useEffect(() => {
    const saved = localStorage.getItem("aq-theme");
    if (saved === "dark") setIsDark(true);
  }, []);

  // Write to localStorage on every toggle
  // TODO: when Supabase auth is ready, also upsert here:
  // await supabase.from("user_preferences").upsert({ user_id, theme: isDark ? "dark" : "light" })
  useEffect(() => {
    localStorage.setItem("aq-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark((p) => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);