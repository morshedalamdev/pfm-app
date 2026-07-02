import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  reporter: "list",
  testDir: ".",
  timeout: 90_000,
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.E2E_APP_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
