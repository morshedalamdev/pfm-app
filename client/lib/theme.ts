export const THEME_STORAGE_KEY = "pfm.ui.theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

export function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

export function applyResolvedTheme(
  resolvedTheme: ResolvedTheme,
  preference: ThemePreference,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
}

export function applyThemePreference(
  preference: ThemePreference,
): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference);
  applyResolvedTheme(resolvedTheme, preference);
  return resolvedTheme;
}
