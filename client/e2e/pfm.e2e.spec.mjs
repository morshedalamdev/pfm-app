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
  ).toBeDisabled();
  await expect(
    achievement.getByRole("button", { name: "Delete recurring income" }),
  ).toBeDisabled();
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

  await deleteWithoutBody(api, `/api/v1/transactions/${paidTransaction.id}`);
  await deleteJson(api, `/api/v1/recurring-rules/${recurringExpense.id}`);

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
  const groceriesBudget = await postJson(api, "/api/v1/budgets", {
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
    amount: "50.00",
    note: "E2E partial settlement",
    settled_at: today,
  });
  await patchJson(api, `/api/v1/accounts/${wallet.id}/disable`);
  await patchJson(api, `/api/v1/accounts/${checking.id}/default`);

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

  await openSettingsFromFooter(page);
  const balanceSourceSelect = getBalanceSourceCombobox(page);
  await expect(balanceSourceSelect).toBeEnabled();
  await balanceSourceSelect.click();
  await expect(
    page.getByRole("option", { name: "Checking (USD)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Loan Wallet (BDT)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Wallet (USD)" }),
  ).toHaveCount(0);
  const budgetSourceOption = page.getByRole("option", {
    name: /Groceries.*USD/,
  });
  await expect(budgetSourceOption).toBeVisible();
  await page.getByRole("option", { name: "Loan Wallet (BDT)" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings updated.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Settings" }),
  ).toBeEnabled();

  await navigateAndWaitForHomeData(page, () => navigateHomeFromHeader(page));
  await expect(page.getByText("Available Balance")).toBeVisible();
  await expect(page.getByText("Loan Wallet", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/BDT.*175\.00/)).toBeVisible();
  await expect(page.getByText("Income", { exact: true })).toBeVisible();
  await expect(page.getByText("Expense", { exact: true })).toBeVisible();
  await expect(page.getByText("$1,200.00", { exact: true })).toBeVisible();
  await expect(page.getByText("$125.50", { exact: true })).toBeVisible();

  await openSettingsFromFooter(page);
  const budgetBalanceSourceSelect = getBalanceSourceCombobox(page);
  await expect(budgetBalanceSourceSelect).toBeEnabled();
  await budgetBalanceSourceSelect.click();
  await page.getByRole("option", { name: /Groceries.*USD/ }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings updated.")).toBeVisible();
  await navigateAndWaitForHomeData(page, () => navigateHomeFromHeader(page));
  await expect(page.getByText("Budget Remaining")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Groceries - /)).toBeVisible();
  await expect(page.getByText("$374.50", { exact: true })).toBeVisible();

  await deleteJson(api, `/api/v1/budgets/${groceriesBudget.id}`);
  await navigateAndWaitForHomeData(page, () => page.reload());
  await expect(page.getByText("Available Balance")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Checking", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("$1,724.50", { exact: true })).toBeVisible();

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
  await expect(
    page.getByRole("button", { name: "Budget: Monthly Budget" }),
  ).toBeVisible();
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

async function deleteJson(api, path) {
  const response = await api.delete(path);
  expect(response.ok(), `${path} ${response.status()}`).toBe(true);
  return response.json();
}

async function deleteWithoutBody(api, path) {
  const response = await api.delete(path);
  expect(response.ok(), `${path} ${response.status()}`).toBe(true);
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

async function navigateHomeFromHeader(page) {
  await page.locator('header a[href="/"]').click();
  await expect(page).toHaveURL(/\/$/);
}

function getBalanceSourceCombobox(page) {
  return page.locator('button[role="combobox"]').nth(1);
}

async function openSettingsFromFooter(page) {
  const footer = page.locator("footer");
  await footer.locator("button").last().click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
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
