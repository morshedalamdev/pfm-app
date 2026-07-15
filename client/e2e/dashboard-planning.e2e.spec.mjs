import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

const now = "2026-07-15T10:30:00.000Z";
const account = {
  archived_at: null,
  created_at: now,
  currency: "USD",
  current_balance: "6400.0000",
  disabled_at: null,
  id: "00000000-0000-4000-8000-000000000001",
  is_archived: false,
  is_default: true,
  is_disabled: false,
  name: "Planning checking",
  opening_balance: "6400.0000",
  type: "bank_account",
  updated_at: now,
};
const baseUser = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: now,
  email: "dashboard-planning@example.test",
  full_name: "Dashboard Planning",
  home_balance_source_id: account.id,
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
        accessToken: "dashboard-planning-token",
        refreshToken: "dashboard-planning-refresh",
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
  await page.route("**/api/v1/accounts?include_archived=false&limit=100", (route) =>
    route.fulfill({
      json: { has_more: false, items: [account], next_cursor: null },
    }),
  );
  await page.route("**/api/v1/transactions?limit=6", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/categories?*", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
});

test("planning sections render budget, savings, commitments, status, and links", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("pfm.ui.theme", "dark");
  });
  await routeDashboardReport(page, { expense: "1500.0000", income: "2000.0000" });
  await routeBudgets(page, [
    budgetFixture({
      categoryName: "Groceries",
      limit: "800.0000",
      percent: "118.0000",
      remaining: "-144.0000",
      spent: "944.0000",
      status: "over_budget",
    }),
    budgetFixture({
      categoryName: "Transport",
      id: "00000000-0000-4000-8000-000000000402",
      limit: "300.0000",
      percent: "42.0000",
      remaining: "174.0000",
      spent: "126.0000",
      status: "on_track",
    }),
  ]);
  await routeSavings(page, [
    savingsFixture({
      name: "Emergency fund",
      percent: "65.0000",
      remaining: "3500.0000",
      saved: "6500.0000",
      status: "active",
      target: "10000.0000",
    }),
    savingsFixture({
      id: "00000000-0000-4000-8000-000000000502",
      name: "Completed camera",
      percent: "100.0000",
      remaining: "0.0000",
      saved: "1200.0000",
      status: "completed",
      target: "1200.0000",
    }),
    savingsFixture({
      id: "00000000-0000-4000-8000-000000000503",
      name: "Zero target placeholder",
      percent: "0.0000",
      remaining: "0.0000",
      saved: "0.0000",
      status: "active",
      target: "0.0000",
    }),
  ]);
  await routeCommitments(page, {
    expenses: [reminderFixture({ description: "Rent reminder" })],
    incomes: [
      reminderFixture({
        amount: "900.0000",
        description: "Client retainer",
        id: "00000000-0000-4000-8000-000000000602",
        type: "income",
      }),
    ],
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await dismissRecurringDialog(page);

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "Budget health" })).toBeVisible();
  await expect(page.getByText("Groceries")).toBeVisible();
  await expect(page.getByText("118% used")).toBeVisible();
  await expect(page.locator('[data-slot="budget-progress-row"]').first()).toContainText(
    "Over budget",
  );
  await expect(
    page
      .locator('[data-slot="card-surface"]')
      .filter({ has: page.getByRole("heading", { name: "Budget health" }) })
      .getByRole("link", { name: "View all" }),
  ).toHaveAttribute("href", "/budget");

  await expect(page.getByRole("heading", { name: "Savings goals" })).toBeVisible();
  await expect(page.getByText("Emergency fund")).toBeVisible();
  await expect(page.getByText("Completed camera")).toBeVisible();
  await expect(page.getByText("Zero target placeholder")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Upcoming commitments" })).toBeVisible();
  await expect(page.getByText("Rent reminder")).toBeVisible();
  await expect(page.getByText("Client retainer")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open transactions/ })).toHaveAttribute(
    "href",
    "/transaction",
  );

  await expect(page.getByRole("heading", { name: "Financial status" })).toBeVisible();
  await expect(page.getByText("Budget attention needed")).toBeVisible();
});

test("planning sections show empty states and omit status when data is not meaningful", async ({
  page,
}) => {
  await routeDashboardReport(page, { expense: "0.0000", income: "0.0000" });
  await routeBudgets(page, []);
  await routeSavings(page, []);
  await routeCommitments(page, { expenses: [], incomes: [] });

  await page.goto("/");
  await dismissRecurringDialog(page);

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("No budgets yet")).toBeVisible();
  await expect(page.getByText("No savings goals yet")).toBeVisible();
  await expect(page.getByText("No commitments due")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Financial status" })).toHaveCount(0);
});

test("budget section retries independently", async ({ page }) => {
  let failBudget = true;

  await routeDashboardReport(page, { expense: "0.0000", income: "0.0000" });
  await page.route("**/api/v1/budgets?*", (route) => {
    if (failBudget) {
      failBudget = false;
      return route.fulfill({
        status: 500,
        json: {
          error: {
            code: "server_error",
            message: "Budget progress unavailable",
          },
        },
      });
    }

    return route.fulfill({
      json: {
        has_more: false,
        items: [
          budgetFixture({
            categoryName: "Dining",
            limit: "250.0000",
            percent: "50.0000",
            remaining: "125.0000",
            spent: "125.0000",
            status: "on_track",
          }),
        ],
        next_cursor: null,
      },
    });
  });
  await routeSavings(page, []);
  await routeCommitments(page, { expenses: [], incomes: [] });

  await page.goto("/");
  await dismissRecurringDialog(page);

  await expect(page.getByText("Budgets could not be loaded")).toBeVisible();
  await expect(page.getByText("Budget progress unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Retry budgets" }).click();
  await expect(page.getByText("Dining")).toBeVisible();
  await expect(page.getByText("50% used")).toBeVisible();
});

async function routeDashboardReport(page, { expense, income }) {
  await page.route("**/api/v1/reports/dashboard?*", (route) => {
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "week";
    const type = requestUrl.searchParams.get("type") ?? "expense";
    return route.fulfill({
      json: {
        available_balance: account.current_balance,
        buckets: [
          {
            amount: type === "income" ? income : expense,
            end_at: "2026-07-16T00:00:00.000Z",
            is_current: true,
            label: "Today",
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
      },
    });
  });
}

async function routeBudgets(page, budgets) {
  await page.route("**/api/v1/budgets?*", (route) =>
    route.fulfill({ json: { has_more: false, items: budgets, next_cursor: null } }),
  );
}

async function routeSavings(page, savingsGoals) {
  await page.route("**/api/v1/savings-goals?*", (route) =>
    route.fulfill({
      json: { has_more: false, items: savingsGoals, next_cursor: null },
    }),
  );
}

async function routeCommitments(page, { expenses, incomes }) {
  await page.route("**/api/v1/recurring-rules/due-expenses", (route) =>
    route.fulfill({ json: { items: expenses } }),
  );
  await page.route("**/api/v1/recurring-rules/due-incomes", (route) =>
    route.fulfill({ json: { items: incomes } }),
  );
}

function budgetFixture({
  categoryName,
  id = "00000000-0000-4000-8000-000000000401",
  limit,
  percent,
  remaining,
  spent,
  status,
}) {
  return {
    archived_at: null,
    category_id: null,
    category_name: categoryName,
    created_at: now,
    currency: "USD",
    id,
    is_archived: false,
    limit_amount: limit,
    period_end: "2026-08-01",
    period_start: "2026-07-01",
    period_type: "monthly",
    progress: {
      percent_used: percent,
      remaining_amount: remaining,
      spent_amount: spent,
      status,
    },
    updated_at: now,
  };
}

function savingsFixture({
  id = "00000000-0000-4000-8000-000000000501",
  name,
  percent,
  remaining,
  saved,
  status,
  target,
}) {
  return {
    archived_at: null,
    completed_at: status === "completed" ? now : null,
    created_at: now,
    currency: "USD",
    id,
    monthly_target_amount: "100.0000",
    name,
    note: null,
    progress: {
      is_target_met: status === "completed",
      percent_complete: percent,
      remaining_amount: remaining,
      saved_amount: saved,
    },
    status,
    target_amount: target,
    target_date: "2026-12-01",
    updated_at: now,
  };
}

function reminderFixture({
  amount = "1200.0000",
  description,
  id = "00000000-0000-4000-8000-000000000601",
  type = "expense",
}) {
  return {
    due_at: "2026-07-15T10:30:00.000Z",
    period_key: "2026-07",
    reminder_key: `${id}:2026-07`,
    rule: {
      account_id: account.id,
      amount,
      archived_at: null,
      category_id: "00000000-0000-4000-8000-000000000701",
      created_at: now,
      currency: "USD",
      description,
      end_at: null,
      frequency: "monthly",
      id,
      interval_count: 1,
      last_paid_period: null,
      last_received_period: null,
      last_run_at: null,
      last_run_key: null,
      next_run_at: "2026-07-15T10:30:00.000Z",
      paused_at: null,
      run_count: 0,
      start_at: "2026-01-15T10:30:00.000Z",
      status: "active",
      timezone: "UTC",
      transaction_type: type,
      updated_at: now,
    },
  };
}

async function dismissRecurringDialog(page) {
  for (let index = 0; index < 3; index += 1) {
    const dialog = page.getByRole("dialog");
    try {
      await dialog.waitFor({ state: "visible", timeout: 1500 });
    } catch {
      return;
    }
    await page.getByRole("button", { name: "Close" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 1500 }).catch(() => {});
  }
}
