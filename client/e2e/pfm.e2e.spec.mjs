import { expect, request as playwrightRequest, test } from "@playwright/test";

const appBaseUrl = process.env.E2E_APP_BASE_URL;
const apiBaseUrl = process.env.E2E_API_BASE_URL;

if (!appBaseUrl || !apiBaseUrl) {
  throw new Error("E2E_APP_BASE_URL and E2E_API_BASE_URL are required.");
}

const viewports = [
  { height: 844, label: "mobile", width: 390 },
  { height: 1024, label: "tablet", width: 768 },
  { height: 800, label: "desktop", width: 1280 },
];

test("integrated finance journeys render across breakpoints", async ({ page }) => {
  const email = `pfm-e2e-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Name").fill("E2E User");
  await page.getByPlaceholder("Phone Number").fill("5550100");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await expect(page.getByText("Available Balance")).toBeVisible();

  await openFooterMenu(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "BDT - Bangladeshi Taka" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings updated.")).toBeVisible();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "USD - US Dollar" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings updated.")).toBeVisible();
  await page.goto("/");

  const tokens = await page.evaluate(() => {
    const value = window.localStorage.getItem("pfm.auth.tokens");
    return value ? JSON.parse(value) : null;
  });
  expect(tokens?.accessToken).toBeTruthy();

  const api = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const today = new Date().toISOString();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const checking = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Checking",
    opening_balance: "1000.00",
    type: "bank",
  });
  const wallet = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Wallet",
    opening_balance: "100.00",
    type: "cash",
  });
  const salary = await getCategoryByName(api, "income", "Salary");
  const groceries = await getCategoryByName(api, "expense", "Groceries");

  await postJson(api, "/api/v1/transactions", {
    account_id: checking.id,
    amount: "1200.00",
    category_id: salary.id,
    description: "E2E income",
    transaction_at: today,
    type: "income",
  }, { "Idempotency-Key": `e2e-income-${Date.now()}` });
  await postJson(api, "/api/v1/transactions", {
    account_id: checking.id,
    amount: "125.50",
    category_id: groceries.id,
    description: "E2E groceries",
    transaction_at: today,
    type: "expense",
  }, { "Idempotency-Key": `e2e-expense-${Date.now()}` });
  await postJson(api, "/api/v1/transactions/transfers", {
    amount: "50.00",
    description: "E2E transfer",
    from_account_id: checking.id,
    to_account_id: wallet.id,
    transaction_at: today,
  }, { "Idempotency-Key": `e2e-transfer-${Date.now()}` });
  await postJson(api, "/api/v1/budgets", {
    category_id: groceries.id,
    currency: "USD",
    limit_amount: "500.00",
    period_end: nextMonth.toISOString().slice(0, 10),
    period_start: monthStart.toISOString().slice(0, 10),
    period_type: "monthly",
  });
  const goal = await postJson(api, "/api/v1/savings-goals", {
    currency: "USD",
    monthly_target_amount: "200.00",
    name: "Emergency Fund",
    note: "E2E goal",
    target_amount: "1000.00",
    target_date: null,
  });
  await postJson(api, `/api/v1/savings-goals/${goal.id}/contributions`, {
    amount: "150.00",
    contributed_at: today,
    note: "E2E contribution",
  });
  await api.dispose();

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/v1/notifications/unread-count") &&
      response.status() === 200,
    ),
    page.waitForResponse((response) =>
      response.url().includes("/api/v1/transactions") &&
      response.status() === 200,
    ),
    page.reload(),
  ]);
  await expect(page.getByText("Available Balance")).toBeVisible();

  await page.goto("/transaction/create");
  await page.getByText("Account").click();
  await expect(page.getByRole("button", { name: "Checking" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByText("Category").click();
  await expect(page.getByRole("button", { name: "Groceries" })).toBeVisible();
  await page.keyboard.press("Escape");
  await assertDateSelectionStyle(page);

  await page.goto("/budget/setup");
  await expect(page.getByText("Groceries")).toBeVisible();
  await expect(page.getByText("Dining")).toBeVisible();
  await expect(
    page
      .locator('[data-slot="field"]')
      .filter({ hasText: "Groceries" })
      .locator('input[type="number"]'),
  ).toHaveValue("500.00");
  await page
    .locator('[data-slot="field"]')
    .filter({ hasText: "Dining" })
    .locator('input[type="number"]')
    .fill("120.00");
  await page.getByRole("button", { name: "Save Budget" }).click();
  await expect(page).toHaveURL(/\/budget$/);
  await expect(page.getByText("Loading budgets...")).not.toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Dining")).toBeVisible();

  await page.goto("/transaction");
  await expect(page.getByText("E2E income")).toBeVisible();
  await expect(page.getByText("E2E groceries")).toBeVisible();
  await expect(page.getByText("E2E transfer")).toHaveCount(2);

  await page.goto("/budget");
  await expect(page.getByText("Monthly Budget")).toBeVisible();
  await expect(page.getByText("Loading budgets...")).not.toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Groceries")).toBeVisible();

  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    await assertRenderedWithoutOverflow(page, "/analytics", viewport.label);
    await page.locator('footer a[href="/"]').click();
    await assertRenderedWithoutOverflow(page, "/", viewport.label);
    await page.locator('footer a[href="/transaction"]').click();
    await assertRenderedWithoutOverflow(page, "/transaction", viewport.label);
    await page.locator('footer a[href="/analytics"]').click();
    await assertRenderedWithoutOverflow(page, "/analytics", viewport.label);

    await openFooterMenu(page);
    await page.getByRole("link", { name: "Budget Planning" }).click();
    await assertRenderedWithoutOverflow(page, "/budget", viewport.label);
    await page.goBack();
    await assertRenderedWithoutOverflow(page, "/analytics", viewport.label);

    await openFooterMenu(page);
    await page.getByRole("link", { name: "Savings Goals" }).click();
    await assertRenderedWithoutOverflow(page, "/savings", viewport.label);
    await page.goBack();
    await assertRenderedWithoutOverflow(page, "/analytics", viewport.label);

    await openFooterMenu(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await assertRenderedWithoutOverflow(page, "/settings", viewport.label);
    await page.goBack();
    await assertRenderedWithoutOverflow(page, "/analytics", viewport.label);
  }

  await openFooterMenu(page);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
});

async function postJson(api, path, body, headers = {}) {
  const response = await api.post(path, {
    data: body,
    headers,
  });
  expect(response.ok(), `${path} ${response.status()}`).toBe(true);
  return response.json();
}

async function getCategoryByName(api, kind, name) {
  const response = await api.get(`/api/v1/categories?kind=${kind}&limit=100`);
  expect(response.ok(), `categories ${kind} ${response.status()}`).toBe(true);
  const body = await response.json();
  const category = body.items.find((item) => item.name === name);
  expect(category, `${kind} category ${name}`).toBeTruthy();
  return category;
}

async function assertDateSelectionStyle(page) {
  const labels = await page.evaluate(() => {
    const today = new Date();
    const selected = new Date(today);
    selected.setDate(today.getDate() + 1);
    return {
      selected: selected.toLocaleDateString(),
      today: today.toLocaleDateString(),
    };
  });

  const dateField = page.getByLabel("Expense").getByText("Date");

  await dateField.click();
  await page.locator(`button[data-day="${labels.selected}"]`).click();

  const selectedButton = page.locator(`button[data-day="${labels.selected}"]`);
  const todayButton = page.locator(`button[data-day="${labels.today}"]`);
  await expect(selectedButton).toHaveAttribute("data-selected-single", "true");
  await expect(selectedButton).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(todayButton).not.toHaveAttribute("data-selected-single", "true");
  await expect(todayButton).not.toHaveCSS("background-color", "rgb(0, 0, 0)");
  await page.keyboard.press("Escape");
}

const routeText = {
  "/": "available balance",
  "/analytics": "Analytics",
  "/budget": "Budget",
  "/settings": "Settings",
  "/savings": "Savings Goals",
  "/transaction": "Transaction",
};

async function assertRenderedWithoutOverflow(page, path, viewportLabel) {
  const visibleMain = page.locator("main:not([aria-hidden='true'])").last();
  await expect(visibleMain).toContainText(routeText[path], { timeout: 15_000 });
  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return (
      root.scrollWidth > root.clientWidth + 1 ||
      body.scrollWidth > body.clientWidth + 1
    );
  });
  expect(hasHorizontalOverflow, `${viewportLabel} ${path}`).toBe(false);
}

async function openFooterMenu(page) {
  await page.locator("footer").getByRole("button").last().click();
}
