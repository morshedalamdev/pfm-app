import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dashboard = {
  available_balance: "87457.8500",
  buckets: [],
  currency: "USD",
  expense_amount: "8145.7800",
  income_amount: "4875.1200",
  net_flow_amount: "-3270.6600",
  period: "month",
  range: { end_at: "2025-12-01T00:00:00Z", start_at: "2025-11-01T00:00:00Z", timezone: "UTC" },
  type: "expense",
};

const transactions = {
  has_more: false,
  items: [
    {
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: "354.2500",
      category_id: "22222222-2222-2222-2222-222222222222",
      created_at: "2025-11-12T10:00:00Z",
      currency: "USD",
      description: "Cash withdrawal",
      id: "33333333-3333-3333-3333-333333333333",
      transaction_at: "2025-11-12T10:00:00Z",
      type: "expense",
      updated_at: "2025-11-12T10:00:00Z",
      voided_at: null,
    },
    {
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: "4875.1200",
      category_id: "22222222-2222-2222-2222-222222222222",
      created_at: "2025-11-10T10:00:00Z",
      currency: "USD",
      description: "Salary",
      id: "44444444-4444-4444-4444-444444444444",
      transaction_at: "2025-11-10T10:00:00Z",
      type: "income",
      updated_at: "2025-11-10T10:00:00Z",
      voided_at: null,
    },
  ],
  next_cursor: null,
};

const account = {
  archived_at: null,
  created_at: "2025-11-01T00:00:00Z",
  currency: "USD",
  current_balance: "87457.8500",
  disabled_at: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_archived: false,
  is_default: true,
  is_disabled: false,
  name: "Daily wallet",
  opening_balance: "0.0000",
  type: "bank_account",
  updated_at: "2025-11-01T00:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/reports/dashboard**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: dashboard });
  });
  await page.route("**/api/backend/transactions**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: transactions });
  });
  await page.route("**/api/backend/accounts?**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } });
  });
  await page.route("**/api/backend/notifications/unread-count", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { unread_count: 1 } });
  });
  await page.goto("/");
  await expect(page.getByText("Cash withdrawal")).toBeVisible();
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

    for (const route of ["/", "/analytics", "/budget", "/goal", "/transaction", "/settings"]) {
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
  await expect(page.getByText("Cash withdrawal")).toBeVisible();

  await expect(page).toHaveScreenshot("home-light.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("matches the dark theme reference baseline", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("pfm-mobile-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("Cash withdrawal")).toBeVisible();

  await expect(page).toHaveScreenshot("home-dark.png", {
    animations: "disabled",
    fullPage: true,
  });
});

test("shows empty recent activity without replacing live totals", async ({ page }) => {
  await page.route("**/api/backend/transactions**", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } });
  });
  await page.goto("/");

  await expect(page.getByText("$87,457")).toBeVisible();
  await expect(page.getByText("No transactions this month")).toBeVisible();
});

test("shows a retryable error when the home API fails", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/backend/reports/dashboard**", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ contentType: "application/json", json: { error: { message: "Unavailable" } }, status: 503 });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: dashboard });
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Couldn’t load your overview" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Cash withdrawal")).toBeVisible();
});
