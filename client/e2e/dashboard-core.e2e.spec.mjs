import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

const now = "2026-07-15T00:00:00.000Z";
const account = {
  archived_at: null,
  created_at: now,
  currency: "USD",
  current_balance: "1234567.8900",
  disabled_at: null,
  id: "00000000-0000-4000-8000-000000000001",
  is_archived: false,
  is_default: true,
  is_disabled: false,
  name: "Primary dashboard checking account with long label",
  opening_balance: "1234567.8900",
  type: "bank_account",
  updated_at: now,
};

const baseUser = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: now,
  email: "dashboard-core@example.test",
  full_name: "Dashboard Core",
  home_balance_source_id: account.id,
  home_balance_source_type: "account",
  id: "00000000-0000-4000-8000-000000000099",
  is_active: true,
  occupation: null,
  phone_number: null,
};

test("dashboard core summary renders, switches period, retries, and respects theme", async ({
  page,
}) => {
  let failReport = true;
  const reportRequests = [];

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pfm.auth.tokens",
      JSON.stringify({
        accessToken: "dashboard-core-token",
        refreshToken: "dashboard-core-refresh",
        expiresAt: Date.now() + 60_000,
      }),
    );
    window.localStorage.setItem("pfm.ui.theme", "dark");
  });

  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: baseUser }),
  );
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { unread_count: 0 } }),
  );
  await page.route("**/api/v1/accounts?include_archived=false&limit=100", (route) =>
    route.fulfill({
      json: { has_more: false, items: [account], next_cursor: null },
    }),
  );
  await page.route("**/api/v1/transactions?limit=6", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/categories?limit=100", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/recurring-rules/due-expenses", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/api/v1/recurring-rules/due-incomes", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/api/v1/reports/dashboard?*", (route) => {
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "week";
    const type = requestUrl.searchParams.get("type") ?? "expense";
    reportRequests.push({ period, type });

    if (failReport) {
      failReport = false;
      return route.fulfill({
        status: 500,
        json: {
          error: {
            code: "server_error",
            message: "Dashboard summary unavailable",
          },
        },
      });
    }

    const income = period === "month" ? "0.0000" : "9999999.9900";
    const expense = period === "month" ? "245.6700" : "12345678.1200";
    return route.fulfill({
      json: dashboardReport({ expense, income, period, type }),
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", {
      name: "$1,234,567.89",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Primary dashboard checking account with long label").first(),
  ).toBeVisible();
  const summaryAlert = page.getByRole("alert");
  await expect(
    summaryAlert.getByText("Dashboard summary could not be loaded"),
  ).toBeVisible();
  await expect(summaryAlert.getByText("Dashboard summary unavailable")).toBeVisible();

  await page.getByRole("button", { name: "Retry summary" }).click();
  await expect(page.getByText("$9,999,999.99")).toBeVisible();
  await expect(page.getByText("$12,345,678.12")).toBeVisible();
  await expect(page.getByText("-$2,345,678.13")).toBeVisible();

  const periodControl = page.getByRole("group", { name: "Dashboard period" });
  await expect(periodControl.getByRole("button", { name: "Week" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await periodControl.getByRole("button", { name: "Month" }).click();
  await expect(periodControl.getByRole("button", { name: "Month" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
  await expect(page.getByText("-$245.67")).toBeVisible();

  await page.setViewportSize({ height: 800, width: 1280 });
  await expect(page.getByRole("heading", { name: "$1,234,567.89" })).toBeVisible();
  await focusDashboardPeriodButton(page);

  expect(reportRequests.some((request) => request.period === "week")).toBe(true);
  expect(reportRequests.some((request) => request.period === "month")).toBe(true);
});

async function focusDashboardPeriodButton(page) {
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    const focusedText = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    if (["Week", "Month", "Year"].includes(focusedText)) {
      await expect(page.locator(":focus")).toHaveAttribute("aria-pressed");
      return;
    }
  }
  throw new Error("Dashboard period selector was not keyboard reachable");
}

function dashboardReport({ expense, income, period, type }) {
  return {
    available_balance: "1234567.8900",
    buckets: [
      {
        amount: expense,
        end_at: "2026-07-16T00:00:00.000Z",
        is_current: true,
        label: period === "year" ? "Jul" : "Today",
        start_at: "2026-07-15T00:00:00.000Z",
      },
    ],
    currency: "USD",
    expense_amount: expense,
    income_amount: income,
    net_flow_amount: String(Number(income) - Number(expense)),
    period,
    range: {
      end_at: "2026-07-22T00:00:00.000Z",
      start_at: "2026-07-15T00:00:00.000Z",
      timezone: "UTC",
    },
    type,
  };
}
