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

test("recurring expense actions and income achievement popup are safe", async ({
  page,
}) => {
  const email = `pfm-recurring-actions-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Name").fill("Recurring Actions User");
  await page.getByPlaceholder("Phone Number").fill("5550199");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);
  await expect(page.getByText("Available Balance")).toBeVisible();

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

  const account = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Reminder Account",
    opening_balance: "200.00",
    type: "bank",
  });
  const category = await getCategoryByName(api, "expense", "Groceries");
  const salary = await getCategoryByName(api, "income", "Salary");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const closeDueAt = new Date(monthStart);
  closeDueAt.setUTCMinutes(closeDueAt.getUTCMinutes() + 1);
  const incomeDueAt = new Date(monthStart);
  incomeDueAt.setUTCMinutes(incomeDueAt.getUTCMinutes() + 2);

  const deletedExpense = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "17.00",
    category_id: category.id,
    description: "E2E delete bill",
    frequency: "monthly",
    interval_count: 1,
    start_at: monthStart.toISOString(),
    timezone: "UTC",
    transaction_type: "expense",
  });
  const closeOnlyExpense = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "11.00",
    category_id: category.id,
    description: "E2E close only bill",
    frequency: "monthly",
    interval_count: 1,
    start_at: closeDueAt.toISOString(),
    timezone: "UTC",
    transaction_type: "expense",
  });
  const incomeRule = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "2500.00",
    category_id: salary.id,
    description: "Job Salary",
    frequency: "monthly",
    interval_count: 1,
    start_at: incomeDueAt.toISOString(),
    timezone: "UTC",
    transaction_type: "income",
  });

  await page.reload();
  const recurringWarning = page.getByRole("dialog");
  await expect(recurringWarning.getByText("E2E delete bill")).toBeVisible();
  await recurringWarning
    .getByRole("button", { name: "Delete recurring expense" })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await expect(
    confirmation.getByRole("heading", { name: "Delete recurring expense?" }),
  ).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(recurringWarning.getByText("E2E close only bill")).toBeVisible();

  const archivedRule = await getJson(
    api,
    `/api/v1/recurring-rules/${deletedExpense.id}`,
  );
  expect(archivedRule.status).toBe("archived");
  expect(archivedRule.last_paid_period).toBeNull();
  const closeRuleBeforeDismiss = await getJson(
    api,
    `/api/v1/recurring-rules/${closeOnlyExpense.id}`,
  );
  expect(closeRuleBeforeDismiss.status).toBe("active");
  expect(closeRuleBeforeDismiss.last_paid_period).toBeNull();
  const storedIncomeRule = await getJson(
    api,
    `/api/v1/recurring-rules/${incomeRule.id}`,
  );
  expect(storedIncomeRule.status).toBe("active");
  expect(storedIncomeRule.last_received_period).toBeNull();
  expect(
    (await getJson(api, "/api/v1/transactions?limit=100")).items,
  ).toHaveLength(0);
  expect(
    Number(
      (await getJson(api, "/api/v1/accounts?limit=100")).items.find(
        (item) => item.id === account.id,
      ).current_balance,
    ),
  ).toBe(200);

  await recurringWarning.getByRole("button", { name: "Close" }).click();
  await expect(recurringWarning).toBeHidden();
  const closeRuleAfterDismiss = await getJson(
    api,
    `/api/v1/recurring-rules/${closeOnlyExpense.id}`,
  );
  expect(closeRuleAfterDismiss.status).toBe("active");
  expect(closeRuleAfterDismiss.last_paid_period).toBeNull();
  const dueAfterClose = await getJson(
    api,
    "/api/v1/recurring-rules/due-expenses",
  );
  expect(dueAfterClose.items.map((item) => item.rule.id)).toEqual([
    closeOnlyExpense.id,
  ]);

  await page.reload();
  await expect(
    page.getByRole("dialog").getByText("E2E close only bill"),
  ).toBeVisible({ timeout: 15_000 });
  await page.route("**/api/v1/categories?kind=income*", (route) =>
    route.fulfill({
      json: { items: [salary], limit: 100, offset: 0, total: 1 },
    }),
  );
  await page.route(
    "**/api/v1/accounts?include_archived=false&limit=100",
    (route) =>
      route.fulfill({
        json: { items: [account], limit: 100, offset: 0, total: 1 },
      }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete recurring expense" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently" })
    .click();
  const achievement = page.getByRole("dialog");
  await expect(
    achievement.getByRole("heading", {
      name: /Have you received your .*Job Salary.*\?/,
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    achievement.getByText("Income achievement", { exact: true }),
  ).toBeVisible();
  await expect(achievement.getByText("Salary", { exact: true })).toBeVisible();
  await expect(
    achievement.getByText("Job Salary", { exact: true }),
  ).toBeVisible();
  await expect(
    achievement.getByText("Reminder Account", { exact: true }),
  ).toBeVisible();
  await expect(achievement.getByText("USD", { exact: true })).toBeVisible();
  await expect(achievement.getByText(/2,500\.00/)).toBeVisible();
  await expect(achievement.getByText("Due date", { exact: true })).toBeVisible();
  await expect(
    achievement.getByRole("button", { name: "Mark recurring income received" }),
  ).toBeEnabled();
  await expect(
    achievement.getByRole("button", { name: "Delete recurring income" }),
  ).toBeEnabled();
  await expect(
    achievement.getByRole("button", { name: "Close" }),
  ).toBeVisible();
  await expect(achievement).toHaveClass(/border-emerald-400/);
  const achievementFitsViewport = await achievement.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return (
      bounds.left >= 0 &&
      bounds.right <= window.innerWidth &&
      bounds.top >= 0 &&
      bounds.bottom <= window.innerHeight
    );
  });
  expect(achievementFitsViewport).toBe(true);

  await page.unroute("**/api/v1/categories?kind=income*");
  await page.unroute(
    "**/api/v1/accounts?include_archived=false&limit=100",
  );
  let receivedResult;
  let receivedRequestCount = 0;
  await page.route(
    `**/api/v1/recurring-rules/${incomeRule.id}/received`,
    async (route) => {
      const browserRequest = route.request();
      const receivedAt = browserRequest.postDataJSON().received_at;
      receivedRequestCount += 1;
      receivedResult = {
        rule: {
          ...incomeRule,
          last_received_period: monthStart.toISOString().slice(0, 7),
        },
        transaction: {
          account_id: account.id,
          amount: "2500.0000",
          category_id: salary.id,
          created_at: receivedAt,
          currency: "USD",
          description: "Job Salary",
          id: "00000000-0000-4000-8000-000000000075",
          transaction_at: receivedAt,
          type: "income",
          updated_at: receivedAt,
          voided_at: null,
        },
      };
      await route.fulfill({ json: receivedResult, status: 200 });
    },
  );
  await page.route(
    "**/api/v1/accounts?include_archived=false&limit=100",
    (route) =>
      route.fulfill({
        json: {
          has_more: false,
          items: [
            { ...account, current_balance: "2700.0000", is_default: true },
          ],
          next_cursor: null,
        },
      }),
  );
  await page.route(
    "**/api/v1/reports/dashboard?period=week&type=expense",
    (route) =>
      route.fulfill({
        json: {
          available_balance: "2700.0000",
          buckets: [],
          currency: "USD",
          expense_amount: "0.0000",
          income_amount: "2500.0000",
          net_flow_amount: "2500.0000",
          period: "week",
          range: {
            end_at: new Date(
              monthStart.getTime() + 7 * 86_400_000,
            ).toISOString(),
            start_at: monthStart.toISOString(),
            timezone: "UTC",
          },
          type: "expense",
        },
      }),
  );
  await page.route("**/api/v1/transactions?limit=6", (route) =>
    route.fulfill({
      json: {
        has_more: false,
        items: receivedResult ? [receivedResult.transaction] : [],
        next_cursor: null,
      },
    }),
  );
  await page.route("**/api/v1/categories?limit=100", (route) =>
    route.fulfill({
      json: { has_more: false, items: [category, salary], next_cursor: null },
    }),
  );
  await page.route(
    "**/api/v1/budgets?month=*&include_archived=false&limit=100",
    (route) =>
      route.fulfill({
        json: { has_more: false, items: [], next_cursor: null },
      }),
  );
  const receivedClickStartedAt = Date.now();
  await achievement
    .getByRole("button", { name: "Mark recurring income received" })
    .click();
  await expect(achievement).toBeHidden();

  expect(receivedRequestCount).toBe(1);
  const receivedTransaction = receivedResult.transaction;
  expect(receivedTransaction.type).toBe("income");
  expect(receivedTransaction.account_id).toBe(account.id);
  expect(receivedTransaction.category_id).toBe(salary.id);
  expect(receivedTransaction.currency).toBe("USD");
  expect(receivedTransaction.description).toBe("Job Salary");
  expect(Number(receivedTransaction.amount)).toBe(2500);
  expect(Date.parse(receivedTransaction.transaction_at)).toBeGreaterThanOrEqual(
    receivedClickStartedAt,
  );
  expect(Date.parse(receivedTransaction.transaction_at)).toBeLessThanOrEqual(
    Date.now(),
  );

  const receivedRule = receivedResult.rule;
  expect(receivedRule.status).toBe("active");
  expect(receivedRule.last_received_period).toBe(
    monthStart.toISOString().slice(0, 7),
  );
  await expect(page.getByText("$2,700.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$2,500.00", { exact: true })).toBeVisible();
  await api.dispose();
});

test("recurring income Delete is permanent and Close is temporary", async ({
  page,
}) => {
  const email = `pfm-income-delete-close-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Name").fill("Income Actions User");
  await page.getByPlaceholder("Phone Number").fill("5550188");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const account = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Income Action Account",
    opening_balance: "300.00",
    type: "bank",
  });
  const salary = await getCategoryByName(api, "income", "Salary");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const closeDueAt = new Date(monthStart);
  closeDueAt.setUTCMinutes(closeDueAt.getUTCMinutes() + 1);

  const deleteRule = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "700.00",
    category_id: salary.id,
    description: "E2E delete income",
    frequency: "monthly",
    interval_count: 1,
    start_at: monthStart.toISOString(),
    timezone: "UTC",
    transaction_type: "income",
  });
  const closeRule = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "800.00",
    category_id: salary.id,
    description: "E2E close income",
    frequency: "monthly",
    interval_count: 1,
    start_at: closeDueAt.toISOString(),
    timezone: "UTC",
    transaction_type: "income",
  });

  await page.reload();
  const achievement = page.getByRole("dialog");
  await expect(
    achievement.getByText("E2E delete income", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await achievement
    .getByRole("button", { name: "Delete recurring income" })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await expect(
    confirmation.getByRole("heading", { name: "Delete recurring income?" }),
  ).toBeVisible();
  await expect(
    confirmation.getByText(
      /will not create a transaction or change your account balance/i,
    ),
  ).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(
    achievement.getByText("E2E close income", { exact: true }),
  ).toBeVisible();

  const archivedRule = await getJson(
    api,
    `/api/v1/recurring-rules/${deleteRule.id}`,
  );
  expect(archivedRule.status).toBe("archived");
  expect(archivedRule.last_received_period).toBeNull();
  expect(
    (await getJson(api, "/api/v1/recurring-rules/due-incomes")).items.map(
      (item) => item.rule.id,
    ),
  ).toEqual([closeRule.id]);
  expect(
    (await getJson(api, "/api/v1/transactions?limit=100")).items,
  ).toHaveLength(0);
  expect(
    Number(
      (await getJson(api, `/api/v1/accounts/${account.id}`)).current_balance,
    ),
  ).toBe(300);

  await achievement.getByRole("button", { name: "Close" }).click();
  await expect(achievement).toBeHidden();
  const closedRule = await getJson(
    api,
    `/api/v1/recurring-rules/${closeRule.id}`,
  );
  expect(closedRule.status).toBe("active");
  expect(closedRule.last_received_period).toBeNull();
  expect(
    (await getJson(api, "/api/v1/recurring-rules/due-incomes")).items.map(
      (item) => item.rule.id,
    ),
  ).toEqual([closeRule.id]);

  await page.reload();
  await expect(
    page
      .getByRole("dialog")
      .getByText("E2E close income", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  expect(
    (await getJson(api, "/api/v1/transactions?limit=100")).items,
  ).toHaveLength(0);
  expect(
    Number(
      (await getJson(api, `/api/v1/accounts/${account.id}`)).current_balance,
    ),
  ).toBe(300);
  await api.dispose();
});

test("received income stays hidden after reload without suppressing expense", async ({
  page,
}) => {
  const email = `pfm-income-persistence-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Name").fill("Income Persistence User");
  await page.getByPlaceholder("Phone Number").fill("5550177");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const account = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Persistence Account",
    opening_balance: "400.00",
    type: "bank",
  });
  const salary = await getCategoryByName(api, "income", "Salary");
  const groceries = await getCategoryByName(api, "expense", "Groceries");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const expenseDueAt = new Date(monthStart);
  expenseDueAt.setUTCMinutes(expenseDueAt.getUTCMinutes() + 1);

  const incomeRule = await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "800.00",
    category_id: salary.id,
    description: "Persistent salary",
    frequency: "monthly",
    interval_count: 1,
    start_at: monthStart.toISOString(),
    timezone: "UTC",
    transaction_type: "income",
  });
  await postJson(api, "/api/v1/recurring-rules", {
    account_id: account.id,
    amount: "25.00",
    category_id: groceries.id,
    description: "Persistence expense",
    frequency: "monthly",
    interval_count: 1,
    start_at: expenseDueAt.toISOString(),
    timezone: "UTC",
    transaction_type: "expense",
  });
  const receivedAt = new Date().toISOString();
  const received = await postJson(
    api,
    `/api/v1/recurring-rules/${incomeRule.id}/received`,
    { received_at: receivedAt },
  );
  expect(received.rule.status).toBe("active");
  expect(received.rule.last_received_period).toBe(
    monthStart.toISOString().slice(0, 7),
  );

  await page.reload();
  const expenseWarning = page.getByRole("dialog");
  await expect(
    expenseWarning.getByRole("heading", { name: "Recurring expense due" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    expenseWarning.getByText("Persistence expense", { exact: true }),
  ).toBeVisible();
  await expect(
    expenseWarning.getByText("Persistent salary", { exact: true }),
  ).toHaveCount(0);
  await expect(expenseWarning).toHaveClass(/border-amber-400/);
  expect(
    (await getJson(api, "/api/v1/recurring-rules/due-incomes")).items,
  ).toHaveLength(0);

  await page.reload();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Persistence expense", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  const transactions = await getJson(api, "/api/v1/transactions?limit=100");
  expect(transactions.items).toHaveLength(1);
  expect(transactions.items[0].id).toBe(received.transaction.id);
  expect(Date.parse(transactions.items[0].transaction_at)).toBe(
    Date.parse(receivedAt),
  );
  expect(
    Number(
      (await getJson(api, `/api/v1/accounts/${account.id}`)).current_balance,
    ),
  ).toBe(1200);
  await api.dispose();
});

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
  await waitForHomeBootstrap(page);
  await expect(page.getByText("Available Balance")).toBeVisible();

  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create Account" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/accounts/create`);
  await page.getByLabel("Account name").fill("Pocket Pay");
  const accountType = page.getByRole("combobox", { name: "Account Type" });
  await expect(accountType.locator("option")).toHaveText([
    "Debit Card",
    "Credit Card",
    "Bank Account",
    "Mobile Banking",
    "Cash",
  ]);
  await accountType.selectOption("mobile_banking");
  await page.getByLabel("Account currency").selectOption("BDT");
  await page.getByLabel("Initial budget / balance").fill("125.50");
  await page.getByRole("button", { name: "Add Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/accounts`);
  const pocketPay = page.getByRole("button", { name: /Pocket Pay/ });
  await expect(pocketPay).toContainText("BDT");
  await expect(pocketPay).toContainText("Mobile Banking");
  await expect(
    pocketPay.locator('[data-account-type-icon="mobile_banking"]'),
  ).toBeVisible();
  await pocketPay.click();
  const accountDialog = page.getByRole("dialog");
  await expect(
    accountDialog.getByRole("heading", { name: "Pocket Pay" }),
  ).toBeVisible();
  await expect(accountDialog.getByText("BDT", { exact: true })).toBeVisible();
  await expect(
    accountDialog.getByText("Mobile Banking", { exact: true }),
  ).toBeVisible();
  await expect(
    accountDialog.locator('[data-account-type-icon="mobile_banking"]'),
  ).toBeVisible();
  await expect(accountDialog.getByText(/BDT.*125\.50/).first()).toBeVisible();
  await expect(accountDialog.getByText("Active", { exact: true })).toBeVisible();
  await accountDialog.getByRole("button", { name: "Delete Account" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Pocket Pay")).toHaveCount(0);
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
  const yesterday = new Date(visibleDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const loanIssuedAt = new Date(visibleDate);
  loanIssuedAt.setDate(loanIssuedAt.getDate() - 2);
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
  const loanWallet = await postJson(api, "/api/v1/accounts", {
    currency: "BDT",
    name: "Loan Wallet",
    opening_balance: "100.00",
    type: "wallet",
  });
  await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Emergency Savings",
    opening_balance: "300.00",
    type: "savings",
  });
  const salary = await getCategoryByName(api, "income", "Salary");
  const groceries = await getCategoryByName(api, "expense", "Groceries");

  const recurringExpense = await postJson(api, "/api/v1/recurring-rules", {
    account_id: checking.id,
    amount: "42.00",
    category_id: groceries.id,
    description: "E2E mobile bill",
    frequency: "monthly",
    interval_count: 1,
    start_at: monthStart.toISOString(),
    timezone: "UTC",
    transaction_type: "expense",
  });
  await page.reload();
  const recurringWarning = page.getByRole("dialog");
  await expect(
    recurringWarning.getByRole("heading", { name: "Recurring expense due" }),
  ).toBeVisible();
  await expect(
    recurringWarning.getByText("Groceries", { exact: true }),
  ).toBeVisible();
  await expect(
    recurringWarning.getByText("Checking · USD", { exact: true }),
  ).toBeVisible();
  await expect(
    recurringWarning.getByText("E2E mobile bill", { exact: true }),
  ).toBeVisible();
  await expect(
    recurringWarning.getByText("$42.00", { exact: true }),
  ).toBeVisible();
  await expect(
    recurringWarning.getByRole("button", { name: /Delete recurring expense/ }),
  ).toBeEnabled();
  await expect(
    recurringWarning.getByRole("button", { name: "Mark recurring expense paid" }),
  ).toBeEnabled();
  const warningFitsViewport = await recurringWarning.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth;
  });
  expect(warningFitsViewport).toBe(true);
  const paidClickStartedAt = Date.now();
  await recurringWarning
    .getByRole("button", { name: "Mark recurring expense paid" })
    .click();
  await expect(recurringWarning).toBeHidden();

  const paidTransactions = await getJson(
    api,
    `/api/v1/transactions?account_id=${checking.id}&limit=100`,
  );
  const paidTransaction = paidTransactions.items.find(
    (transaction) => transaction.description === "E2E mobile bill",
  );
  expect(paidTransaction).toBeTruthy();
  expect(paidTransaction.type).toBe("expense");
  expect(paidTransaction.account_id).toBe(checking.id);
  expect(paidTransaction.category_id).toBe(groceries.id);
  expect(paidTransaction.currency).toBe("USD");
  expect(Number(paidTransaction.amount)).toBe(42);
  expect(Date.parse(paidTransaction.transaction_at)).toBeGreaterThanOrEqual(
    paidClickStartedAt,
  );
  expect(Date.parse(paidTransaction.transaction_at)).toBeLessThanOrEqual(
    Date.now(),
  );

  const paidRule = await getJson(
    api,
    `/api/v1/recurring-rules/${recurringExpense.id}`,
  );
  expect(paidRule.status).toBe("active");
  expect(paidRule.last_paid_period).toBe(monthStart.toISOString().slice(0, 7));
  const dueAfterPaid = await getJson(
    api,
    "/api/v1/recurring-rules/due-expenses",
  );
  expect(dueAfterPaid.items).toHaveLength(0);
  const accountsAfterPaid = await getJson(api, "/api/v1/accounts?limit=100");
  expect(
    Number(
      accountsAfterPaid.items.find((account) => account.id === checking.id)
        .current_balance,
    ),
  ).toBe(958);

  await page.goto("about:blank");
  await postJson(api, "/api/v1/transactions", {
    account_id: checking.id,
    amount: "1200.00",
    category_id: salary.id,
    description: "E2E income",
    transaction_at: today,
    type: "income",
  });
  await postJson(api, "/api/v1/transactions", {
    account_id: checking.id,
    amount: "125.50",
    category_id: groceries.id,
    description: "E2E groceries",
    transaction_at: today,
    type: "expense",
  });
  await postJson(api, "/api/v1/transactions/transfers", {
    amount: "50.00",
    description: "E2E transfer",
    from_account_id: checking.id,
    to_account_id: wallet.id,
    transaction_at: today,
  });
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
    issued_at: loanIssuedAt.toISOString(),
    note: "E2E given loan",
    person_id: loanPerson.id,
    principal_amount: "300.00",
    repay_date: yesterday.toISOString().slice(0, 10),
  });
  await postJson(api, "/api/v1/loans/records", {
    account_id: loanWallet.id,
    currency: "USD",
    direction: "taken",
    issued_at: today,
    note: "E2E taken loan",
    person_id: loanPerson.id,
    principal_amount: "75.00",
    repay_date: nextMonth.toISOString().slice(0, 10),
  });
  await postJson(api, `/api/v1/loans/records/${givenLoan.id}/settlements`, {
    account_id: checking.id,
    amount: "50.00",
    note: "E2E partial settlement",
    settled_at: today,
  });
  await patchJson(api, `/api/v1/accounts/${wallet.id}/disable`);
  await patchJson(api, `/api/v1/accounts/${checking.id}/default`);
  await patchJson(api, "/api/v1/users/me", {
    home_balance_source_id: loanWallet.id,
    home_balance_source_type: "account",
  });

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/v1/notifications/unread-count") &&
      response.status() === 200,
    ),
    page.waitForResponse((response) =>
      response.url().includes("/api/v1/transactions") &&
      response.status() === 200,
    ),
    page.goto("/"),
  ]);
  await expect(page.getByText("Available Balance")).toBeVisible();
  await navigateAndWaitForHomeData(page, () => page.reload());
  await expect(page.getByText("Available Balance")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Checking", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("$1,732.50", { exact: true })).toBeVisible();

  await page.goto("/transaction/create");
  await expect(page.locator("form")).toBeVisible({ timeout: 60_000 });
  await page
    .locator("form")
    .getByText("Account", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Account: Checking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account: Emergency Savings" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Budget:/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Income" }).click();
  await page.locator("form").getByText("Account", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Checking" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Wallet", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Emergency Savings" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Emergency Savings" }).click();
  await expect(
    page.locator("form").getByText("Emergency Savings", { exact: true }),
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
  await expect(page.getByRole("button", { name: /^Budget:/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Account: Checking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Account: Wallet", exact: true }),
  ).toHaveCount(0);
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

  await page.goto("/loan");
  await expect(page.getByRole("heading", { name: "Loan & Debt" })).toBeVisible({
    timeout: 15000,
  });
  const loanSummary = page.getByRole("region", { name: "Loan due summary" });
  await expect(loanSummary.locator(":scope > *")).toHaveCount(2);
  await expect(loanSummary.getByText("Given Loan Due", { exact: true })).toBeVisible();
  await expect(loanSummary.getByText("Taken Loan Due", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Friend")).toHaveCount(2);
  await expect(page.getByText("$250.00").first()).toBeVisible();
  await expect(page.getByText(/BDT.*75\.00/).first()).toBeVisible();
  const overdueLoan = page.locator('[data-overdue="true"]');
  await expect(overdueLoan).toHaveCount(1);
  await expect(overdueLoan).toHaveClass(/border-destructive/);
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

  const accounts = await getJson(api, "/api/v1/accounts?limit=100");
  for (const account of accounts.items.filter((item) => !item.is_disabled)) {
    await patchJson(api, `/api/v1/accounts/${account.id}/disable`);
  }

  await navigateAndWaitForHomeData(page, () => page.goto("/"));
  await expect(page.getByText("No balance source available")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("--", { exact: true })).toBeVisible();
  await api.dispose();
});

test("dedicated account creation page stores the selected type", async ({
  page,
}) => {
  const email = `pfm-account-create-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Name").fill("Account Route User");
  await page.getByPlaceholder("Phone Number").fill("5550123");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Create Account" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/accounts/create`);

  const accountType = page.getByRole("combobox", { name: "Account Type" });
  await expect(accountType.locator("option")).toHaveText([
    "Debit Card",
    "Credit Card",
    "Bank Account",
    "Mobile Banking",
    "Cash",
  ]);
  await page.getByPlaceholder("Account name").fill("Travel Credit");
  await accountType.selectOption("credit_card");
  await page
    .getByRole("combobox", { name: "Account currency" })
    .selectOption("EUR");
  await page.getByPlaceholder("0.00").fill("120.50");
  await page.getByRole("button", { name: "Add Account" }).click();

  await expect(page).toHaveURL(`${appBaseUrl}/accounts`);
  const accountItem = page.getByRole("button", {
    name: /Travel Credit.*Credit Card.*EUR/,
  });
  await expect(accountItem).toBeVisible();
  await expect(
    accountItem.locator('[data-account-type-icon="credit_card"]'),
  ).toBeVisible();
  await accountItem.click();
  await expect(
    page.getByRole("dialog").getByText("Credit Card", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .locator('[data-account-type-icon="credit_card"]'),
  ).toBeVisible();
});

test("PKR and MYR currencies and Refund income source are available", async ({
  page,
}) => {
  const email = `pfm-currency-refund-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

  await page.goto("/accounts/create");
  const currencySelect = page.getByRole("combobox", {
    name: "Account currency",
  });
  await expect(currencySelect.locator('option[value="PKR"]')).toHaveText(
    "PKR - Pakistani Rupee",
  );
  await expect(currencySelect.locator('option[value="MYR"]')).toHaveText(
    "MYR - Malaysian Ringgit",
  );

  await page.getByPlaceholder("Account name").fill("Pakistan Wallet");
  await currencySelect.selectOption("PKR");
  await page.getByPlaceholder("0.00").fill("1000.00");
  await page.getByRole("button", { name: "Add Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/accounts`);
  await expect(
    page.getByRole("button", { name: /Pakistan Wallet.*PKR/ }),
  ).toBeVisible();

  await page.goto("/transaction/create");
  const form = page.locator("form");
  await expect(form).toBeVisible({ timeout: 60_000 });
  await page.getByRole("tab", { name: "Income" }).click();
  await form.getByText("Source", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Refund" })).toBeVisible();
});

test("Home uses the default account and Settings is unavailable", async ({
  page,
}) => {
  const email = `pfm-default-home-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const oldSource = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Old Home Source",
    opening_balance: "999.00",
    type: "bank_account",
  });
  const defaultAccount = await postJson(api, "/api/v1/accounts", {
    currency: "EUR",
    name: "Euro Main",
    opening_balance: "250.00",
    type: "bank_account",
  });
  await patchJson(api, `/api/v1/accounts/${defaultAccount.id}/default`);
  await patchJson(api, "/api/v1/users/me", {
    home_balance_source_id: oldSource.id,
    home_balance_source_type: "account",
  });

  await page.goto("/");
  await expect(page.getByText("Available Balance")).toBeVisible();
  await expect(page.getByText("Euro Main", { exact: true })).toBeVisible();
  await expect(page.getByText("€250.00", { exact: true })).toBeVisible();
  await expect(page.getByText("Old Home Source", { exact: true })).toHaveCount(0);

  const footer = page.locator("footer");
  await footer.locator("button").last().click();
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  const settingsResponse = await page.goto("/settings");
  expect(settingsResponse?.status()).toBe(404);
  await api.dispose();
});

test("transaction selectors contain only active accounts", async ({ page }) => {
  const email = `pfm-account-only-transactions-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Everyday Account",
    opening_balance: "500.00",
    type: "bank_account",
  });
  await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Cash Reserve",
    opening_balance: "100.00",
    type: "cash",
  });
  const disabledAccount = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Disabled Account",
    opening_balance: "50.00",
    type: "debit_card",
  });
  await patchJson(api, `/api/v1/accounts/${disabledAccount.id}/disable`);

  await page.goto("/transaction/create");
  const form = page.locator("form");
  await expect(form).toBeVisible({ timeout: 60_000 });

  await form.getByText("Account", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Everyday Account", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cash Reserve", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Budget:/ })).toHaveCount(0);
  await expect(page.getByText("Disabled Account", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Income" }).click();
  await form.getByText("Account", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Everyday Account", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cash Reserve", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Budget:/ })).toHaveCount(0);
  await expect(page.getByText("Disabled Account", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Transfer" }).click();
  await form.getByText("To", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Everyday Account", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cash Reserve", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Cash", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /^Budget:/ })).toHaveCount(0);
  await expect(page.getByText("Disabled Account", { exact: true })).toHaveCount(0);

  await api.dispose();
});

test("transfer form excludes the source and requires converted amounts", async ({
  page,
}) => {
  const email = `pfm-transfer-conversion-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const cnyAccount = await postJson(api, "/api/v1/accounts", {
    currency: "CNY",
    name: "CNY Wallet",
    opening_balance: "1000.00",
    type: "mobile_banking",
  });
  const bdtAccount = await postJson(api, "/api/v1/accounts", {
    currency: "BDT",
    name: "BDT Bank",
    opening_balance: "10000.00",
    type: "bank_account",
  });
  await postJson(api, "/api/v1/accounts", {
    currency: "BDT",
    name: "BDT Wallet",
    opening_balance: "0.00",
    type: "cash",
  });

  await page.goto("/transaction/create");
  const form = page.locator("form");
  await expect(form).toBeVisible({ timeout: 60_000 });
  await page.getByRole("tab", { name: "Transfer" }).click();

  await form.getByText("From Account", { exact: true }).click();
  await page.getByRole("button", { name: "BDT Bank", exact: true }).click();
  await form.getByText("To", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "BDT Bank", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "BDT Wallet", exact: true }).click();
  await expect(page.getByLabel("Converted Amount")).toHaveCount(0);

  await form.getByText("From Account", { exact: true }).click();
  await page.getByRole("button", { name: "CNY Wallet", exact: true }).click();
  await form.getByText("To", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CNY Wallet", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "BDT Bank", exact: true }).click();

  const convertedAmount = page.getByLabel("Converted Amount");
  await expect(convertedAmount).toBeVisible();
  await expect(convertedAmount).toHaveAttribute("required", "");
  await form.locator('input[type="number"]').first().fill("100");
  await convertedAmount.fill("1910");
  await Promise.all([
    page.waitForURL(/\/transaction$/),
    form.getByRole("button", { name: "Add Transfer" }).click(),
  ]);

  expect(
    Number((await getJson(api, `/api/v1/accounts/${cnyAccount.id}`)).current_balance),
  ).toBe(900);
  expect(
    Number((await getJson(api, `/api/v1/accounts/${bdtAccount.id}`)).current_balance),
  ).toBe(11910);

  await page.goto("/transaction/create");
  const reverseForm = page.locator("form");
  await expect(reverseForm).toBeVisible({ timeout: 60_000 });
  await page.getByRole("tab", { name: "Transfer" }).click();
  await reverseForm.getByText("From Account", { exact: true }).click();
  await page.getByRole("button", { name: "BDT Bank", exact: true }).click();
  await reverseForm.getByText("To", { exact: true }).click();
  await page.getByRole("button", { name: "CNY Wallet", exact: true }).click();
  await reverseForm.locator('input[type="number"]').first().fill("5000");
  await page.getByLabel("Converted Amount").fill("260");
  await Promise.all([
    page.waitForURL(/\/transaction$/),
    reverseForm.getByRole("button", { name: "Add Transfer" }).click(),
  ]);

  expect(
    Number((await getJson(api, `/api/v1/accounts/${bdtAccount.id}`)).current_balance),
  ).toBe(6910);
  expect(
    Number((await getJson(api, `/api/v1/accounts/${cnyAccount.id}`)).current_balance),
  ).toBe(1160);
  await api.dispose();
});

test("budget uses the default account currency without double counting", async ({
  page,
}) => {
  const email = `pfm-budget-default-currency-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const myrAccount = await postJson(api, "/api/v1/accounts", {
    currency: "MYR",
    name: "MYR Default",
    opening_balance: "5000.00",
    type: "bank_account",
  });
  await patchJson(api, `/api/v1/accounts/${myrAccount.id}/default`);

  await page.goto("/budget/setup");
  await expect(page.getByRole("tab", { name: "Custom" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("MYR", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Custom" }).click();
  await page.locator('input[type="number"]').first().fill("2000");
  const setupForm = page.locator("form");
  await setupForm.locator('input[type="number"]').first().fill("2000");
  await Promise.all([
    page.waitForURL(/\/budget$/),
    setupForm.getByRole("button", { name: "Save Budget" }).click(),
  ]);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const budgetList = await getJson(
    api,
    `/api/v1/budgets?month=${month}&include_archived=false&limit=100`,
  );
  expect(budgetList.items).toHaveLength(2);
  expect(budgetList.items.every((budget) => budget.currency === "MYR")).toBe(true);
  const categoryBudget = budgetList.items.find(
    (budget) => budget.category_id !== null,
  );
  expect(categoryBudget).toBeTruthy();

  await postJson(api, "/api/v1/transactions", {
    account_id: myrAccount.id,
    amount: "200.00",
    category_id: categoryBudget.category_id,
    description: "MYR budget expense",
    transaction_at: now.toISOString(),
    type: "expense",
  });
  await page.reload();

  const summary = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Monthly Budget" }),
  });
  await expect(summary.locator("h3")).toHaveText(/MYR\s*2,000\.00/);
  await expect(
    summary.getByText("Spent", { exact: true }).locator("..").locator("h4"),
  ).toHaveText(/MYR\s*200\.00/);
  await expect(
    summary.getByText("Remaining", { exact: true }).locator("..").locator("h4"),
  ).toHaveText(/MYR\s*1,800\.00/);
  await expect(summary.getByText(/10% used/)).toBeVisible();
  await api.dispose();
});

test("savings creation defaults currency and allows another selection", async ({
  page,
}) => {
  const email = `pfm-savings-currency-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const myrAccount = await postJson(api, "/api/v1/accounts", {
    currency: "MYR",
    name: "MYR Savings Default",
    opening_balance: "5000.00",
    type: "bank_account",
  });
  await patchJson(api, `/api/v1/accounts/${myrAccount.id}/default`);

  await page.goto("/savings/create");
  const currencySelect = page.getByRole("combobox", {
    name: "Savings plan currency",
  });
  await expect(currencySelect).toBeVisible({ timeout: 60_000 });
  await expect(currencySelect).toHaveValue("MYR");
  await expect(currencySelect.locator('option[value="PKR"]')).toHaveText(
    "PKR - Pakistani Rupee",
  );
  await currencySelect.selectOption("PKR");
  await page.locator('input[type="number"]').first().fill("1200");
  await page.getByPlaceholder("Goal name").fill("Pakistan Trip");
  await Promise.all([
    page.waitForURL(/\/savings$/),
    page.getByRole("button", { name: "Add Goal" }).click(),
  ]);

  const goals = await getJson(
    api,
    "/api/v1/savings-goals?status=all&limit=100",
  );
  const goal = goals.items.find((item) => item.name === "Pakistan Trip");
  expect(goal).toBeTruthy();
  expect(goal.currency).toBe("PKR");
  expect(Number(goal.target_amount)).toBe(1200);
  expect(Number(goal.monthly_target_amount)).toBe(400);
  await api.dispose();
});

test("loan settlement account selection updates balances", async ({ page }) => {
  const email = `pfm-loan-settlement-account-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const loanAccount = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Loan Source",
    opening_balance: "500.00",
    type: "bank_account",
  });
  const settlementAccount = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Settlement Wallet",
    opening_balance: "200.00",
    type: "mobile_banking",
  });
  const disabledAccount = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Inactive Settlement Account",
    opening_balance: "100.00",
    type: "cash",
  });
  await patchJson(api, `/api/v1/accounts/${disabledAccount.id}/disable`);
  const person = await postJson(api, "/api/v1/loans/people", {
    name: "Settlement E2E Person",
    phone_number: `556${Date.now().toString().slice(-7)}`,
  });
  const issuedAt = new Date().toISOString();
  const repayDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await postJson(api, "/api/v1/loans/records", {
    account_id: loanAccount.id,
    currency: "USD",
    direction: "given",
    issued_at: issuedAt,
    person_id: person.id,
    principal_amount: "50.00",
    repay_date: repayDate,
  });
  await postJson(api, "/api/v1/loans/records", {
    account_id: loanAccount.id,
    currency: "USD",
    direction: "taken",
    issued_at: issuedAt,
    person_id: person.id,
    principal_amount: "30.00",
    repay_date: repayDate,
  });

  await page.goto("/loan");
  await expect(page.getByText("Settlement E2E Person").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.locator("[data-overdue]").filter({ hasText: "$50.00" }).click();
  const settlementSelect = page.getByRole("combobox", {
    name: "Settlement account",
  });
  await expect(settlementSelect).toBeVisible();
  await expect(
    settlementSelect.locator(`option[value="${disabledAccount.id}"]`),
  ).toHaveCount(0);
  await settlementSelect.selectOption(settlementAccount.id);
  await page.getByPlaceholder("$0.00").fill("10.00");
  await page.getByRole("button", { name: "Settle Partially" }).click();
  await expect(page.getByText("$40.00", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("[data-overdue]").filter({ hasText: "$30.00" }).click();
  await page
    .getByRole("combobox", { name: "Settlement account" })
    .selectOption(settlementAccount.id);
  await page.getByPlaceholder("$0.00").fill("5.00");
  await page.getByRole("button", { name: "Settle Partially" }).click();
  await expect(page.getByText("$25.00", { exact: true }).first()).toBeVisible();

  const accounts = await getJson(api, "/api/v1/accounts?limit=100");
  const updatedLoanAccount = accounts.items.find(
    (account) => account.id === loanAccount.id,
  );
  const updatedSettlementAccount = accounts.items.find(
    (account) => account.id === settlementAccount.id,
  );
  expect(Number(updatedLoanAccount.current_balance)).toBe(480);
  expect(Number(updatedSettlementAccount.current_balance)).toBe(205);

  await api.dispose();
});

test("used account hides the delete button", async ({ page }) => {
  const email = `pfm-used-account-delete-${Date.now()}@example.test`;
  const password = "StrongPass123!";

  await page.setViewportSize(viewports[0]);
  await page.goto("/auth/register");
  await page.getByPlaceholder("Email").fill(email);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.getByPlaceholder("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(`${appBaseUrl}/`);
  await waitForHomeBootstrap(page);

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

  const usedAccount = await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Used Account",
    opening_balance: "100.00",
    type: "debit_card",
  });
  await postJson(api, "/api/v1/accounts", {
    currency: "USD",
    name: "Unused Account",
    opening_balance: "100.00",
    type: "cash",
  });
  const groceries = await getCategoryByName(api, "expense", "Groceries");
  await postJson(
    api,
    "/api/v1/transactions",
    {
      account_id: usedAccount.id,
      amount: "5.00",
      category_id: groceries.id,
      transaction_at: new Date().toISOString(),
      type: "expense",
    },
    { "Idempotency-Key": `used-account-${Date.now()}` },
  );

  await page.goto("/accounts");
  await expect(page.getByText("Used Account", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(
          `/api/v1/accounts/${usedAccount.id}/delete-eligibility`,
        ) && response.status() === 200,
    ),
    page.getByRole("button", { name: /Used Account/ }).click(),
  ]);
  let accountDialog = page.getByRole("dialog");
  await expect(
    accountDialog.getByRole("heading", { name: "Used Account" }),
  ).toBeVisible();
  await expect(
    accountDialog.getByRole("button", { name: "Delete Account" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  const unusedAccountButton = page.getByRole("button", {
    name: /Unused Account/,
  });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/delete-eligibility") &&
        response.status() === 200,
    ),
    unusedAccountButton.click(),
  ]);
  accountDialog = page.getByRole("dialog");
  await expect(
    accountDialog.getByRole("button", { name: "Delete Account" }),
  ).toBeVisible();

  await api.dispose();
});

async function waitForHomeBootstrap(page) {
  await expect(page.getByText("Cash", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

async function postJson(api, path, body, headers = {}) {
  const response = await api.post(path, {
    data: body,
    headers,
  });
  expect(response.ok(), `${path} ${response.status()}`).toBe(true);
  return response.json();
}

async function patchJson(api, path, body) {
  const response = await api.patch(path, body === undefined ? {} : { data: body });
  expect(response.ok(), `${path} ${response.status()}`).toBe(true);
  return response.json();
}

async function getJson(api, path) {
  const response = await api.get(path);
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

async function navigateAndWaitForHomeData(page, navigate) {
  await navigate();
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
