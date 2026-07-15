import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

test("shared finance primitives render accessibly across themes and viewports", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((nextTheme) => {
      window.localStorage.setItem("pfm.ui.theme", nextTheme);
    }, theme);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/component-preview");

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByTestId("surfaces")).toBeVisible();
      await expect(page.getByText("$1,234,567,890.12")).toBeVisible();
      await expect(page.getByText("-$321.98")).toBeVisible();
      await expect(page.getByText("125%")).toBeVisible();
      await expect(page.getByText("Custom label with longer copy")).toBeVisible();

      const overBudgetProgress = page.getByRole("progressbar", {
        name: "Over budget progress",
      });
      await expect(overBudgetProgress).toHaveAttribute(
        "aria-valuetext",
        "128 percent",
      );
      await expect(overBudgetProgress).toHaveAttribute("aria-valuenow", "100");
      await expect(
        page.getByRole("progressbar", { name: "Zero target savings progress" }),
      ).toHaveAttribute("aria-valuetext", "0 percent, target is zero");

      const hasNoHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      expect(hasNoHorizontalOverflow).toBe(true);

      await page.keyboard.press("Tab");
      await expect(page.getByTestId("interactive-card")).toBeFocused();
    }
  }
});
