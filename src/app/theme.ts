import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const KEY = "theme";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Storage may be unavailable; fall back to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** Dark by default, following the system until the user picks one. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const onChange = () => setTheme(initialTheme());
    window.addEventListener("theme-change", onChange);
    return () => window.removeEventListener("theme-change", onChange);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not persisted; still applies for this session.
    }
    setTheme(next);
    window.dispatchEvent(new Event("theme-change"));
  };
  return [theme, toggle];
}

applyTheme(initialTheme());
