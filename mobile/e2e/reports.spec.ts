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
const account = { archived_at: null, created_at: "2025-01-01T00:00:00Z", currency: "USD", current_balance: "2450.0000", disabled_at: null, id: "33333333-3333-3333-3333-333333333333", is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "2000.0000", type: "bank_account", updated_at: "2025-01-01T00:00:00Z" };
const loanSummary = { currency: "USD", due_loan: "750.0000", total_loan_given: "1000.0000", total_loan_taken: "250.0000" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/reports/monthly-summary**", async (route) => route.fulfill({ contentType: "application/json", json: summary }));
  await page.route("**/api/backend/reports/cash-flow**", async (route) => route.fulfill({ contentType: "application/json", json: cashFlow }));
  await page.route("**/api/backend/reports/spending-by-category**", async (route) => route.fulfill({ contentType: "application/json", json: spending }));
  await page.route("**/api/backend/loans/summary", async (route) => route.fulfill({ contentType: "application/json", json: loanSummary }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } }));
});

test("renders live expense and income report modes", async ({ page }) => {
  await page.goto("/analytics");
  await expect(page.getByText("$8,145.78").first()).toBeVisible();
  await expect(page.getByText("Dining")).toBeVisible();
  await page.getByRole("button", { name: "Income" }).click();
  await expect(page.getByText("$12,000.00").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Income overview" })).toBeVisible();
});

test("covers budget, goal, loan, and account analytics areas", async ({ page }) => {
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Budget" }).click();
  await expect(page.getByText("45.5%", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open budget planning" })).toHaveAttribute("href", "/budget");

  await page.getByRole("button", { name: "Goal" }).click();
  await expect(page.getByText("Active savings goals")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open savings goals" })).toHaveAttribute("href", "/goal");

  await page.getByRole("button", { name: "Loan" }).click();
  await expect(page.getByText("$750.00")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open loan records" })).toHaveAttribute("href", "/loan");

  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByText("Daily wallet")).toBeVisible();
  await expect(page.getByText("$2,450.00")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open all accounts" })).toHaveAttribute("href", "/accounts");
});

test("shows a clean report empty state", async ({ page }) => {
  await page.route("**/api/backend/reports/cash-flow**", async (route) => route.fulfill({ contentType: "application/json", json: { ...cashFlow, buckets: [] } }));
  await page.route("**/api/backend/reports/spending-by-category**", async (route) => route.fulfill({ contentType: "application/json", json: { ...spending, items: [] } }));
  await page.goto("/analytics");
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
  await page.goto("/analytics");
  await expect(page.getByText("Couldn’t load this report")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Dining")).toBeVisible();
});

test("report stays accessible and inside the phone viewport", async ({ page }) => {
  await page.goto("/analytics");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
