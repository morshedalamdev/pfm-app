import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

test("theme boot applies saved and system preferences", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    window.localStorage.removeItem("pfm.ui.theme");
  });
  await page.goto("/auth/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.addInitScript(() => {
    window.localStorage.setItem("pfm.ui.theme", "light");
  });
  await page.goto("/auth/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light",
  );
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.addInitScript(() => {
    window.localStorage.setItem("pfm.ui.theme", "dark");
  });
  await page.goto("/auth/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "dark",
  );
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.addInitScript(() => {
    window.localStorage.setItem("pfm.ui.theme", "not-a-theme");
  });
  await page.goto("/auth/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );
});
