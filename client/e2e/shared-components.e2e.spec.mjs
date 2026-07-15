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
      await expect(page.getByTestId("financial-cards")).toBeVisible();
      await expect(page.getByText("Available balance")).toBeVisible();
      await expect(page.getByText("Financial summary")).toBeVisible();
      await expect(page.getByTestId("domain-cards")).toBeVisible();
      await expect(
        page.getByText("Very long primary checking account name"),
      ).toBeVisible();
      await expect(page.getByText("Emergency fund with a very long goal name")).toBeVisible();
      await expect(page.getByText("Taylor Morgan")).toBeVisible();
      await expect(page.getByTestId("financial-rows")).toBeVisible();
      await expect(
        page.getByText("Coffee and bakery with long merchant name"),
      ).toBeVisible();
      await expect(page.getByText("Groceries and household essentials")).toBeVisible();
      await expect(page.getByText("Recurring utility payment")).toBeVisible();
      await expect(page.getByTestId("chart-cards")).toBeVisible();
      await expect(page.getByText("Cash flow")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Loading chart" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Empty chart" }),
      ).toBeVisible();

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
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Account actions" })).toBeFocused();

      await expect(page.getByTestId("interaction-preview")).toBeVisible();
      await expect(page.getByLabel("Display name")).toBeVisible();
      await expect(page.getByText("Amount must be greater than zero.")).toBeVisible();
      await page.getByLabel("Search preview").fill("coffee");
      await expect(page.getByLabel("Search preview")).toHaveValue("coffee");
      await expect(page.getByRole("radio", { name: "All" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await page.getByRole("radio", { name: "Expense" }).click();
      await expect(page.getByRole("radio", { name: "Expense" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await page.getByRole("button", { name: "Remove filter" }).click();
      await expect(page.getByText("Active month")).toHaveCount(0);
      await page.getByRole("tab", { name: "Details" }).click();
      await expect(page.getByText("Details panel")).toBeVisible();

      const dialogTrigger = page.getByRole("button", { name: "Open dialog" });
      await dialogTrigger.click();
      await expect(page.getByRole("dialog", { name: "Preview dialog" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Preview dialog" })).toHaveCount(0);
      await expect(dialogTrigger).toBeFocused();

      const drawerTrigger = page.getByRole("button", { name: "Open drawer" });
      await drawerTrigger.click();
      await expect(page.getByRole("dialog", { name: "Preview drawer" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Preview drawer" })).toHaveCount(0);

      const sheetTrigger = page.getByRole("button", { name: "Open sheet" });
      await sheetTrigger.click();
      await expect(page.getByRole("dialog", { name: "Preview sheet" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Preview sheet" })).toHaveCount(0);

      await page.getByRole("button", { name: "Open confirm" }).click();
      await expect(page.getByRole("alertdialog", { name: "Confirm action" })).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("alertdialog", { name: "Confirm action" })).toHaveCount(0);

      await page.getByRole("button", { name: "Open destructive" }).click();
      await expect(page.getByRole("alertdialog", { name: "Delete record?" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("alertdialog", { name: "Delete record?" })).toHaveCount(0);
    }
  }
});
