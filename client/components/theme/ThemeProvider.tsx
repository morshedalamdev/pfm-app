"use client";

import {
  applyThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
  writeStoredThemePreference,
} from "@/lib/theme";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const storedPreference = readStoredThemePreference();
    setPreferenceState(storedPreference);
    setResolvedTheme(applyThemePreference(storedPreference));
  }, []);

  useEffect(() => {
    if (preference !== "system") {
      setResolvedTheme(applyThemePreference(preference));
      return;
    }

    setResolvedTheme(applyThemePreference("system"));

    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      setResolvedTheme(applyThemePreference("system"));
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    writeStoredThemePreference(nextPreference);
    setPreferenceState(nextPreference);
    setResolvedTheme(applyThemePreference(nextPreference));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme:
        preference === "system" ? resolvedTheme : resolveTheme(preference),
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
