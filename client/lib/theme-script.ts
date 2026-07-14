import { THEME_STORAGE_KEY } from "@/lib/theme";

export function getThemeInitScript(): string {
  return `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const validPreferences = new Set(["system", "light", "dark"]);
  const root = document.documentElement;

  function readPreference() {
    try {
      const storedPreference = window.localStorage.getItem(storageKey);
      return validPreferences.has(storedPreference) ? storedPreference : "system";
    } catch {
      return "system";
    }
  }

  function resolveTheme(preference) {
    if (preference === "light" || preference === "dark") {
      return preference;
    }

    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  const preference = readPreference();
  const resolvedTheme = resolveTheme(preference);

  root.dataset.themeBooting = "true";
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;

  requestAnimationFrame(() => {
    delete root.dataset.themeBooting;
  });
})();
`;
}
