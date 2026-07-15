import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const account = {
  archived_at: null,
  created_at: "2026-07-01T00:00:00Z",
  currency: "USD",
  current_balance: "2450.0000",
  disabled_at: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_archived: false,
  is_default: true,
  is_disabled: false,
  name: "Daily wallet",
  opening_balance: "2000.0000",
  type: "bank_account",
  updated_at: "2026-07-01T00:00:00Z",
};

const category = {
  archived_at: null,
  created_at: "2026-07-01T00:00:00Z",
  icon_key: "food",
  id: "22222222-2222-2222-2222-222222222222",
  is_archived: false,
  is_default: true,
  kind: "expense",
  name: "Dining",
  updated_at: "2026-07-01T00:00:00Z",
};

const range = {
  end_at: "2026-08-01T00:00:00Z",
  start_at: "2026-07-01T00:00:00Z",
  timezone: "UTC",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/accounts**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { has_more: false, items: [account], next_cursor: null },
    }),
  );
  await page.route("**/api/backend/categories**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { has_more: false, items: [category], next_cursor: null },
    }),
  );
  await page.route("**/api/backend/transactions?**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { has_more: false, items: [], next_cursor: null },
    }),
  );
  await page.route("**/api/backend/budgets**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { has_more: false, items: [], next_cursor: null },
    }),
  );
  await page.route("**/api/backend/savings-goals**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { has_more: false, items: [], next_cursor: null },
    }),
  );
  await page.route("**/api/backend/reports/monthly-summary**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        active_savings_goal_count: 0,
        budget_used_percent: "0",
        currency: "USD",
        expense_amount: "0",
        income_amount: "0",
        month: "2026-07",
        net_flow_amount: "0",
        range,
        savings_amount: "0",
        savings_month_over_month_percent: "0",
        top_expenses: [],
        trends: {
          average_daily_spending: "0",
          budget_adherence_percent: "0",
          most_expensive_day: null,
        },
      },
    }),
  );
  await page.route("**/api/backend/reports/cash-flow**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { buckets: [], currency: "USD", interval: "day", range },
    }),
  );
  await page.route("**/api/backend/reports/spending-by-category**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { currency: "USD", items: [], range, total_amount: "0" },
    }),
  );
});

test("uses canonical primary navigation and the More drawer", async ({ page }) => {
  await page.goto("/transaction");
  await expect(page.getByRole("heading", { exact: true, name: "Transactions" })).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Transaction" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  await page.getByRole("button", { name: "More" }).click();
  const drawer = page.getByRole("dialog", { name: "More" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Accounts" })).toBeVisible();
  await drawer.getByRole("link", { name: "Accounts" }).click();

  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Accounts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "More" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("traps focus, closes with Escape, and keeps the drawer accessible", async ({ page }) => {
  await page.goto("/transaction");
  const trigger = page.getByRole("button", { name: "More" });
  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "More" });
  await expect(drawer).toBeVisible();
  expect(
    await drawer.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await drawer.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for the More drawer`, async ({ page }) => {
    await page.goto("/transaction");
    await page.evaluate((selectedTheme) => {
      localStorage.setItem("pfm-mobile-theme", selectedTheme);
    }, theme);
    await page.reload();
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await expect(page).toHaveScreenshot(`more-drawer-${theme}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

test("redirects legacy routes to their canonical paths", async ({ page }) => {
  await page.goto("/report");
  await expect(page).toHaveURL(/\/analytics$/);

  await page.goto("/plan");
  await expect(page).toHaveURL(/\/budget$/);

  await page.goto("/transactions/new?type=income");
  await expect(page).toHaveURL(/\/transaction\/new\?type=income$/);
  await expect(page.getByRole("heading", { name: "Add transaction" })).toBeVisible();

  await page.goto("/settings?section=accounts");
  await expect(page).toHaveURL(/\/accounts$/);
});
