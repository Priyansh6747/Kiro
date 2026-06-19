"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "paper" | "midnight" | "nebula" | "sage" | "nightshade";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("midnight");

  useEffect(() => {
    const saved = localStorage.getItem("kiro_theme") as Theme | null;
    if (saved) {
      setThemeState(saved);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    const prevTheme = theme;
    setThemeState(newTheme);
    localStorage.setItem("kiro_theme", newTheme);
    document.documentElement.classList.remove(`theme-${prevTheme}`);
    document.documentElement.classList.add(`theme-${newTheme}`);
  };

  const toggleTheme = () => {
    // We no longer toggle since there are multiple themes, this can just be omitted or cycle.
    // For now we'll just leave it or make it cycle.
    const themes: Theme[] = ["paper", "midnight", "nebula", "sage", "nightshade"];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
