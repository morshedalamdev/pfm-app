import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads inside the mobile canvas without horizontal overflow", async ({ page }) => {

  await expect(
    page.getByRole("heading", { name: "Home overview" }),
  ).toBeVisible();

  const layout = await page.evaluate(() => {
    const app = document.querySelector<HTMLElement>("[data-testid='mobile-app']");

    return {
      appWidth: app?.getBoundingClientRect().width ?? 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.appWidth).toBeLessThanOrEqual(480);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

for (const theme of ["light", "dark"] as const) {
  test(`has no automatically detectable ${theme} theme accessibility violations`, async ({
    page,
  }) => {
    await page.evaluate((selectedTheme) => {
      localStorage.setItem("pfm-mobile-theme", selectedTheme);
    }, theme);

    for (const route of ["/", "/report", "/plan", "/settings"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `${theme} theme overflow at ${route}`).toBe(false);

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme} theme accessibility at ${route}`).toEqual([]);
    }
  });
}

test("matches the light theme reference baseline", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("pfm-mobile-theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await expect(page).toHaveScreenshot("home-light.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("matches the dark theme reference baseline", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("pfm-mobile-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await expect(page).toHaveScreenshot("home-dark.png", {
    animations: "disabled",
    fullPage: true,
  });
});
