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

  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "contacts", {
      configurable: true,
      get() {
        return {
          select: async () => [
            {
              name: ["E2E Contact"],
              tel: ["5552223333"],
            },
          ],
        };
      },
    });
  });

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

  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await page.getByLabel("Account name").fill("Pocket Pay");
  await page.getByLabel("Account currency").selectOption("BDT");
  await page.getByLabel("Initial budget / balance").fill("125.50");
  await page.getByRole("button", { name: "Add Account" }).click();
  const pocketPay = page.getByRole("button", { name: /Pocket Pay/ });
  await expect(pocketPay).toContainText("BDT");
  await pocketPay.click();
  const accountDialog = page.getByRole("dialog");
  await expect(
    accountDialog.getByRole("heading", { name: "Pocket Pay" }),
  ).toBeVisible();
  await expect(accountDialog.getByText("BDT", { exact: true })).toBeVisible();
  await expect(accountDialog.getByText(/BDT.*125\.50/).first()).toBeVisible();
  await expect(accountDialog.getByText("Active", { exact: true })).toBeVisible();
  await accountDialog.getByRole("button", { name: "Delete Account" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Pocket Pay")).toHaveCount(0);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("Current currency: USD - US Dollar")).toBeVisible();
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

  const visibleDate = new Date();
  visibleDate.setHours(12, 0, 0, 0);
  const today = visibleDate.toISOString();
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
  await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Emergency Savings",
    opening_balance: "300.00",
    type: "savings",
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
  const loanPerson = await postJson(api, "/api/v1/loans/people", {
    name: "E2E Friend",
    note: "E2E loan person",
    phone_number: `555${Date.now().toString().slice(-7)}`,
  });
  const givenLoan = await postJson(api, "/api/v1/loans/records", {
    account_id: checking.id,
    currency: "USD",
    direction: "given",
    issued_at: today,
    note: "E2E given loan",
    person_id: loanPerson.id,
    principal_amount: "300.00",
  });
  await postJson(api, "/api/v1/loans/records", {
    account_id: wallet.id,
    currency: "USD",
    direction: "taken",
    issued_at: today,
    note: "E2E taken loan",
    person_id: loanPerson.id,
    principal_amount: "75.00",
  });
  await postJson(api, `/api/v1/loans/records/${givenLoan.id}/settlements`, {
    amount: "50.00",
    note: "E2E partial settlement",
    settled_at: today,
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

  await page.goto("/loan");
  await expect(page.getByRole("heading", { name: "Loan & Debt" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("E2E Friend")).toHaveCount(2);
  await expect(page.getByText("$250.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Manage loan people" }).click();
  await page.getByRole("button", { name: "Select from contacts" }).click();
  await expect(page.getByPlaceholder("Person name")).toHaveValue("E2E Contact");
  await expect(page.getByPlaceholder("Phone number")).toHaveValue("5552223333");
  await expect(page.getByText("Contact details filled.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Person name")).toBeHidden();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertRenderedWithoutOverflow(page, "/loan", viewport.label);
  }

  await page.goto("/transaction/create");
  await expect(page.locator("form")).toBeVisible({ timeout: 60_000 });
  await page
    .locator("form")
    .getByText("Account / Source", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Account: Checking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Budget: Monthly Budget" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saving Account: Emergency Savings" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Income" }).click();
  await page.locator("form").getByText("Account", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Checking" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wallet" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Emergency Savings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Budget: Monthly Budget" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Saving Account: Emergency Savings" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Transfer" }).click();
  await page.locator("form").getByText("To", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Budget: Monthly Budget" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account: Checking" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Account: Wallet" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account: Emergency Savings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Savings: Emergency Fund" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Expense" }).click();
  await page.locator("form").getByText("Category", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Groceries" })).toBeVisible();
  await page.keyboard.press("Escape");
  await assertDateSelectionStyle(page);
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

const routeHeading = {
  "/analytics": "Analytics",
  "/budget": "Budget Planning",
  "/loan": "Loan & Debt",
  "/settings": "Settings",
  "/savings": "Savings Goals",
  "/transaction": "Transaction",
};

async function assertRenderedWithoutOverflow(page, path, viewportLabel) {
  if (path === "/") {
    await expect(page.getByText("Available Balance")).toBeVisible({
      timeout: 15_000,
    });
  } else {
    await expect(
      page.getByRole("heading", { name: routeHeading[path] }),
    ).toBeVisible({ timeout: 15_000 });
  }
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
