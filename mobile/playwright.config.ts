import { defineConfig } from "@playwright/test";

const mobileProjects = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.003,
    },
  },
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3100",
    hasTouch: true,
    isMobile: true,
    trace: "on-first-retry",
  },
  projects: mobileProjects.map(({ name, width, height }) => ({
    name,
    use: { viewport: { width, height } },
  })),
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: { E2E_AUTH_BYPASS: "1" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
