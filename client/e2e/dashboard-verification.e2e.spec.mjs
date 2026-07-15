import { expect, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;

if (!appBaseUrl) {
  throw new Error("E2E_APP_BASE_URL is required.");
}

const now = "2026-07-15T10:30:00.000Z";
const primaryAccount = accountFixture({
  balance: "8750.0000",
  currency: "USD",
  id: "00000000-0000-4000-8000-000000000001",
  isDefault: true,
  name: "Verification checking",
  type: "bank_account",
});
const cashAccount = accountFixture({
  balance: "9500.0000",
  currency: "CNY",
  id: "00000000-0000-4000-8000-000000000002",
  isDefault: false,
  name: "Verification cash wallet",
  type: "cash",
});
const baseUser = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: now,
  email: "dashboard-verification@example.test",
  full_name: "Dashboard Verification",
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
        accessToken: "dashboard-verification-token",
        refreshToken: "dashboard-verification-refresh",
        expiresAt: Date.now() + 60_000,
      }),
    );
  });

  await routeStableDashboard(page);
});

test("dashboard verifies required breakpoints without horizontal overflow", async ({
  page,
}) => {
  const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

  for (const width of widths) {
    await page.setViewportSize({ height: width < 768 ? 844 : 900, width });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "$8,750.00" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Week expenses" })).toBeVisible();
    await expectSectionHeading(page, "Budget health");
    await expectSectionHeading(page, "Savings goals");
    await expectSectionHeading(page, "Upcoming commitments");
    await expectSectionHeading(page, "Financial status");
    await expectNoHorizontalOverflow(page, width);
  }
});

test("dashboard verifies system, light, and dark themes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "system",
  );

  await page.evaluate(() => window.localStorage.setItem("pfm.ui.theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.evaluate(() => window.localStorage.setItem("pfm.ui.theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("dashboard ignores stale period responses and avoids duplicate bootstrap requests", async ({
  page,
}) => {
  const requestCounts = new Map();

  await page.route("**/api/v1/reports/dashboard?*", async (route) => {
    countRequest(requestCounts, "report");
    const requestUrl = new URL(route.request().url());
    const period = requestUrl.searchParams.get("period") ?? "week";
    const type = requestUrl.searchParams.get("type") ?? "expense";

    if (period === "week") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      await route.fulfill({
        json: dashboardReport({
          expense: period === "month" ? "321.0000" : "99.0000",
          income: period === "month" ? "1000.0000" : "500.0000",
          period,
          type,
        }),
      });
    } catch {
      // Aborted stale report requests are expected when the period changes.
    }
  });
  await countRoute(page, requestCounts, "accounts", "**/api/v1/accounts?include_archived=false&limit=100", {
    has_more: false,
    items: [primaryAccount, cashAccount],
    next_cursor: null,
  });
  await countRoute(page, requestCounts, "transactions", "**/api/v1/transactions?limit=6", {
    has_more: false,
    items: [],
    next_cursor: null,
  });
  await countRoute(page, requestCounts, "categories", "**/api/v1/categories?limit=100", {
    has_more: false,
    items: [],
    next_cursor: null,
  });
  await countRoute(page, requestCounts, "budgets", "**/api/v1/budgets?*", {
    has_more: false,
    items: [],
    next_cursor: null,
  });
  await countRoute(page, requestCounts, "savings", "**/api/v1/savings-goals?*", {
    has_more: false,
    items: [],
    next_cursor: null,
  });
  await countRoute(page, requestCounts, "due-expenses", "**/api/v1/recurring-rules/due-expenses", {
    items: [],
  });
  await countRoute(page, requestCounts, "due-incomes", "**/api/v1/recurring-rules/due-incomes", {
    items: [],
  });

  await page.goto("/");
  await page
    .getByRole("group", { name: "Dashboard period" })
    .getByRole("button", { name: "Month" })
    .click();
  await expect(page.getByText("$321.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Month expenses" })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByRole("heading", { name: "Month expenses" })).toBeVisible();
  await expect(page.getByText("$99.00", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2 active accounts across 2 currencies")).toBeVisible();

  expect(requestCounts.get("accounts")).toBe(1);
  expect(requestCounts.get("transactions")).toBeLessThanOrEqual(2);
  expect(requestCounts.get("categories")).toBeLessThanOrEqual(2);
  expect(requestCounts.get("budgets")).toBe(1);
  expect(requestCounts.get("savings")).toBe(1);
  expect(requestCounts.get("due-expenses")).toBe(1);
  expect(requestCounts.get("due-incomes")).toBe(1);
  expect(requestCounts.get("report")).toBeGreaterThanOrEqual(2);
  expect(requestCounts.get("report")).toBeLessThanOrEqual(3);
});

test("dashboard remains usable at zoom levels and from keyboard", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  for (const zoom of ["1", "1.25", "1.5", "2"]) {
    await page.evaluate((nextZoom) => {
      document.documentElement.style.zoom = nextZoom;
    }, zoom);
    await expect(page.getByRole("heading", { name: "$8,750.00" })).toBeVisible();
    await expect(
      page.locator('[data-slot="chart-card"] p:not(.sr-only)').getByText(/Highest bucket/),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, 1280);
  }

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
});

async function routeStableDashboard(page) {
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: baseUser }),
  );
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { unread_count: 0 } }),
  );
  await page.route("**/api/v1/accounts?include_archived=false&limit=100", (route) =>
    route.fulfill({
      json: { has_more: false, items: [primaryAccount, cashAccount], next_cursor: null },
    }),
  );
  await page.route("**/api/v1/transactions?limit=6", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/categories?limit=100", (route) =>
    route.fulfill({ json: { has_more: false, items: [], next_cursor: null } }),
  );
  await page.route("**/api/v1/budgets?*", (route) =>
    route.fulfill({
      json: {
        has_more: false,
        items: [
          {
            archived_at: null,
            category_id: null,
            category_name: "Verification groceries",
            created_at: now,
            currency: "USD",
            id: "00000000-0000-4000-8000-000000000401",
            is_archived: false,
            limit_amount: "800.0000",
            period_end: "2026-08-01",
            period_start: "2026-07-01",
            period_type: "monthly",
            progress: {
              percent_used: "45.0000",
              remaining_amount: "440.0000",
              spent_amount: "360.0000",
              status: "on_track",
            },
            updated_at: now,
          },
        ],
        next_cursor: null,
      },
    }),
  );
  await page.route("**/api/v1/savings-goals?*", (route) =>
    route.fulfill({
      json: {
        has_more: false,
        items: [
          {
            archived_at: null,
            completed_at: null,
            created_at: now,
            currency: "USD",
            id: "00000000-0000-4000-8000-000000000501",
            monthly_target_amount: "100.0000",
            name: "Verification emergency fund",
            note: null,
            progress: {
              is_target_met: false,
              percent_complete: "50.0000",
              remaining_amount: "500.0000",
              saved_amount: "500.0000",
            },
            status: "active",
            target_amount: "1000.0000",
            target_date: "2026-12-01",
            updated_at: now,
          },
        ],
        next_cursor: null,
      },
    }),
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
    return route.fulfill({
      json: dashboardReport({
        expense: "1200.0000",
        income: "1800.0000",
        period,
        type,
      }),
    });
  });
}

async function countRoute(page, requestCounts, key, pattern, json) {
  await page.route(pattern, (route) => {
    countRequest(requestCounts, key);
    return route.fulfill({ json });
  });
}

async function expectSectionHeading(page, name) {
  const heading = page.getByRole("heading", { name });
  await expect(heading).toHaveCount(1);
}

function countRequest(requestCounts, key) {
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
}

async function expectNoHorizontalOverflow(page, width) {
  const metrics = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(width + 1);
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
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

function dashboardReport({ expense, income, period, type }) {
  return {
    available_balance: primaryAccount.current_balance,
    buckets: [
      {
        amount: type === "income" ? income : expense,
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
