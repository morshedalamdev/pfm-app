import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const range = { end_at: "2025-12-01T00:00:00Z", start_at: "2025-11-01T00:00:00Z", timezone: "UTC" };
const summary = {
  active_savings_goal_count: 2,
  budget_used_percent: "45.5000",
  currency: "USD",
  expense_amount: "8145.7800",
  income_amount: "12000.0000",
  month: "2025-11",
  net_flow_amount: "3854.2200",
  range,
  savings_amount: "2800.0000",
  savings_month_over_month_percent: "12.5000",
  top_expenses: [],
  trends: { average_daily_spending: "271.5260", budget_adherence_percent: "45.5000", most_expensive_day: null },
};
const cashFlow = {
  buckets: [
    { end_at: "2025-11-02T00:00:00Z", expense_amount: "120.0000", income_amount: "0.0000", label: "1", net_flow_amount: "-120.0000", start_at: "2025-11-01T00:00:00Z" },
    { end_at: "2025-11-03T00:00:00Z", expense_amount: "410.5000", income_amount: "12000.0000", label: "2", net_flow_amount: "11589.5000", start_at: "2025-11-02T00:00:00Z" },
    { end_at: "2025-11-04T00:00:00Z", expense_amount: "80.2500", income_amount: "0.0000", label: "3", net_flow_amount: "-80.2500", start_at: "2025-11-03T00:00:00Z" },
  ],
  currency: "USD",
  interval: "day",
  range,
};
const spending = {
  currency: "USD",
  items: [
    { amount: "4200.5000", category_id: "11111111-1111-1111-1111-111111111111", category_name: "Dining", icon_key: "coffee", percent: "51.5666" },
    { amount: "2600.0000", category_id: "22222222-2222-2222-2222-222222222222", category_name: "Transport", icon_key: "car", percent: "31.9184" },
  ],
  range,
  total_amount: "8145.7800",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/reports/monthly-summary**", async (route) => route.fulfill({ contentType: "application/json", json: summary }));
  await page.route("**/api/backend/reports/cash-flow**", async (route) => route.fulfill({ contentType: "application/json", json: cashFlow }));
  await page.route("**/api/backend/reports/spending-by-category**", async (route) => route.fulfill({ contentType: "application/json", json: spending }));
});

test("renders live expense and income report modes", async ({ page }) => {
  await page.goto("/report");
  await expect(page.getByText("$8,145.78").first()).toBeVisible();
  await expect(page.getByText("Dining")).toBeVisible();
  await page.getByRole("button", { name: "Income" }).click();
  await expect(page.getByText("$12,000.00").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Income overview" })).toBeVisible();
});

test("shows a clean report empty state", async ({ page }) => {
  await page.route("**/api/backend/reports/cash-flow**", async (route) => route.fulfill({ contentType: "application/json", json: { ...cashFlow, buckets: [] } }));
  await page.route("**/api/backend/reports/spending-by-category**", async (route) => route.fulfill({ contentType: "application/json", json: { ...spending, items: [] } }));
  await page.goto("/report");
  await expect(page.getByText("No expense categories for this month.")).toBeVisible();
  await expect(page.getByText("No daily activity for this month.")).toBeVisible();
});

test("retries a failed report request", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/backend/reports/monthly-summary**", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ contentType: "application/json", json: { error: { message: "Unavailable" } }, status: 503 });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: summary });
  });
  await page.goto("/report");
  await expect(page.getByText("Couldn’t load this report")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Dining")).toBeVisible();
});

test("report stays accessible and inside the phone viewport", async ({ page }) => {
  await page.goto("/report");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
