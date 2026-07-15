import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

const now = "2026-07-15T10:30:00.000Z";
const primaryAccount = accountFixture({
  balance: "1234567.8900",
  currency: "USD",
  id: "00000000-0000-4000-8000-000000000001",
  isDefault: true,
  name: "Primary dashboard checking account",
  type: "bank_account",
});
const cashAccount = accountFixture({
  balance: "9500.0000",
  currency: "CNY",
  id: "00000000-0000-4000-8000-000000000002",
  isDefault: false,
  name: "Wallet cash",
  type: "cash",
});
const groceryCategory = {
  archived_at: null,
  color: "#ef4444",
  created_at: now,
  icon: "shopping-cart",
  id: "00000000-0000-4000-8000-000000000201",
  is_archived: false,
  kind: "expense",
  name: "Groceries",
  updated_at: now,
};
const baseUser = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: now,
  email: "dashboard-activity@example.test",
  full_name: "Dashboard Activity",
  home_balance_source_id: primaryAccount.id,
  home_balance_source_type: "account",
  id: "00000000-0000-4000-8000-000000000099",
  is_active: true,
  occupation: null,
  phone_number: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pfm.auth.tokens",
      JSON.stringify({
        accessToken: "dashboard-activity-token",
        refreshToken: "dashboard-activity-refresh",
        expiresAt: Date.now() + 60_000,
      }),
    );
  });

  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: baseUser }),
  );
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { unread_count: 0 } }),
  );
  await page.route("**/api/v1/budgets?*", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/savings-goals?*", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/recurring-rules/due-expenses", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/api/v1/recurring-rules/due-incomes", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
});

test("cash-flow chart, account preview, and recent transaction preview render with links", async ({
  page,
}) => {
  const reportRequests = [];
  const transactionId = "00000000-0000-4000-8000-000000000301";

  await routeAccounts(page, [primaryAccount, cashAccount]);
  await routeCategories(page, [groceryCategory]);
  await routeTransactions(page, [
    transactionFixture({
      accountId: cashAccount.id,
      amount: "43.2100",
      categoryId: groceryCategory.id,
      description: "Weekly groceries",
      id: transactionId,
      type: "expense",
    }),
  ]);
  await routeDashboardReport(page, ({ period, type }) => {
    reportRequests.push({ period, type });
    return dashboardReport({
      buckets: [
        bucketFixture({ amount: "1200.0000", label: "Mon" }),
        bucketFixture({ amount: "650.0000", isCurrent: true, label: "Today" }),
      ],
      expense: "1850.0000",
      income: "2500.0000",
      period,
      type,
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Week expenses" })).toBeVisible();
  await expect(
    page.locator('[data-slot="chart-card"] > div').getByText(/Highest bucket: Mon/),
  ).toBeVisible();
  await page.locator(".recharts-bar-rectangle, .recharts-rectangle").first().hover();
  await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Primary dashboard checking account" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wallet cash" })).toBeVisible();
  await expect(page.getByText("2 active accounts across 2 currencies")).toBeVisible();
  await expect(
    page
      .locator('[data-slot="card-surface"]')
      .filter({ has: page.getByRole("heading", { name: "Accounts" }) })
      .getByRole("link", { name: "View all" }),
  ).toHaveAttribute("href", "/accounts");

  const transactionLink = page.getByRole("link", { name: /Groceries/ });
  await expect(transactionLink).toBeVisible();
  await expect(transactionLink).toHaveAttribute("href", `/transaction/${transactionId}`);
  await expect(transactionLink).toContainText("Wallet cash");
  await expect(page.getByRole("link", { name: /View all transactions/ })).toHaveAttribute(
    "href",
    "/transaction",
  );

  await page.getByLabel("Change chart type").click();
  await page.getByRole("menuitem", { name: "Income" }).click();
  await expect(page.getByRole("heading", { name: "Week income" })).toBeVisible();
  await page
    .getByRole("group", { name: "Chart period" })
    .getByRole("button", { name: "Month" })
    .click();
  await expect(page.getByRole("heading", { name: "Month income" })).toBeVisible();

  expect(reportRequests.some((request) => request.type === "income")).toBe(true);
  expect(reportRequests.some((request) => request.period === "month")).toBe(true);
});

test("cash-flow chart handles no data in the light theme", async ({ page }) => {
  await routeAccounts(page, [primaryAccount]);
  await routeCategories(page, []);
  await routeTransactions(page, []);
  await routeDashboardReport(page, ({ period, type }) =>
    dashboardReport({
      buckets: [bucketFixture({ amount: "0.0000", isCurrent: true })],
      expense: "0.0000",
      income: "0.0000",
      period,
      type,
    }),
  );

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("No expenses activity", { exact: true })).toBeVisible();
  await expect(page.getByText("No recent transactions yet")).toBeVisible();
});

test("chart errors retry independently while accounts and transactions remain visible", async ({
  page,
}) => {
  let failReport = true;

  await routeAccounts(page, [primaryAccount]);
  await routeCategories(page, [groceryCategory]);
  await routeTransactions(page, [
    transactionFixture({
      accountId: primaryAccount.id,
      amount: "88.0000",
      categoryId: groceryCategory.id,
      description: "Partial error groceries",
      id: "00000000-0000-4000-8000-000000000302",
      type: "expense",
    }),
  ]);
  await page.route("**/api/v1/reports/dashboard?*", (route) => {
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "week";
    const type = requestUrl.searchParams.get("type") ?? "expense";

    if (failReport) {
      failReport = false;
      return route.fulfill({
        status: 500,
        json: {
          error: {
            code: "server_error",
            message: "Dashboard chart unavailable",
          },
        },
      });
    }

    return route.fulfill({
      json: dashboardReport({
        buckets: [bucketFixture({ amount: "88.0000", isCurrent: true })],
        expense: "88.0000",
        income: "0.0000",
        period,
        type,
      }),
    });
  });

  await page.goto("/");

  await expect(
    page.locator('[data-slot="chart-card"]').getByText("Dashboard chart unavailable").last(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Primary dashboard checking account" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Groceries/ })).toBeVisible();
  await page.getByRole("button", { name: "Retry chart" }).click();
  await expect(page.getByRole("heading", { name: "Week expenses" })).toBeVisible();
});

async function routeAccounts(page, accounts) {
  await page.route("**/api/v1/accounts?include_archived=false&limit=100", (route) =>
    route.fulfill({ json: { has_more: false, items: accounts, next_cursor: null } }),
  );
}

async function routeCategories(page, categories) {
  await page.route("**/api/v1/categories?limit=100", (route) =>
    route.fulfill({ json: { has_more: false, items: categories, next_cursor: null } }),
  );
}

async function routeTransactions(page, transactions) {
  await page.route("**/api/v1/transactions?limit=6", (route) =>
    route.fulfill({ json: { has_more: false, items: transactions, next_cursor: null } }),
  );
}

async function routeDashboardReport(page, resolveReport) {
  await page.route("**/api/v1/reports/dashboard?*", (route) => {
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "week";
    const type = requestUrl.searchParams.get("type") ?? "expense";
    return route.fulfill({ json: resolveReport({ period, type }) });
  });
}

function accountFixture({ balance, currency, id, isDefault, name, type }) {
  return {
    archived_at: null,
    created_at: now,
    currency,
    current_balance: balance,
    disabled_at: null,
    id,
    is_archived: false,
    is_default: isDefault,
    is_disabled: false,
    name,
    opening_balance: balance,
    type,
    updated_at: now,
  };
}

function transactionFixture({
  accountId,
  amount,
  categoryId,
  description,
  id,
  type,
}) {
  return {
    account_id: accountId,
    amount,
    category_id: categoryId,
    created_at: now,
    currency: "USD",
    description,
    id,
    transaction_at: now,
    type,
    updated_at: now,
    voided_at: null,
  };
}

function bucketFixture({ amount, isCurrent = false, label = "Today" }) {
  return {
    amount,
    end_at: "2026-07-16T00:00:00.000Z",
    is_current: isCurrent,
    label,
    start_at: "2026-07-15T00:00:00.000Z",
  };
}

function dashboardReport({ buckets, expense, income, period, type }) {
  return {
    available_balance: primaryAccount.current_balance,
    buckets,
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
