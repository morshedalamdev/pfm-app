export const themeTokens = {
  color: {
    brand: {
      100: "#eee7ff",
      300: "#cbb8ff",
      500: "#8b5cf6",
      600: "#7445e7",
      700: "#6033ca",
    },
    blue: "#2f9cf4",
    blueInk: {
      light: "#176fae",
      dark: "#77c5ff",
    },
    coral: "#ff674f",
    coralInk: {
      light: "#b9382a",
      dark: "#ff927f",
    },
    coralStrong: "#c74434",
    green: "#32c777",
    greenInk: {
      light: "#137a45",
      dark: "#7ee0aa",
    },
    orange: "#ff7900",
    red: "#de4160",
    light: {
      canvas: "#efedf2",
      app: "#f8f7fa",
      surface: "#ffffff",
      surfaceMuted: "#f0eef2",
      text: "#17151c",
      textMuted: "#69636f",
      border: "#e7e3ea",
    },
    dark: {
      canvas: "#09080b",
      app: "#111015",
      surface: "#1b191f",
      surfaceMuted: "#25222a",
      text: "#f7f4fa",
      textMuted: "#aaa4b1",
      border: "#302c35",
    },
  },
  radius: {
    small: 12,
    medium: 18,
    large: 24,
    xlarge: 32,
    pill: 999,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },
  typography: {
    family:
      'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    weight: {
      regular: 400,
      medium: 500,
      semibold: 650,
      bold: 750,
    },
  },
} as const;

export type ThemeMode = "light" | "dark" | "system";
