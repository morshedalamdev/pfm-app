import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = {
  account: "11111111-1111-1111-1111-111111111111",
  category: "22222222-2222-2222-2222-222222222222",
  goal: "33333333-3333-3333-3333-333333333333",
  budget: "44444444-4444-4444-4444-444444444444",
};
const account = { archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", current_balance: "2450.0000", disabled_at: null, id: ids.account, is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "2000.0000", type: "bank_account", updated_at: "2026-07-01T00:00:00Z" };
const category = { archived_at: null, created_at: "2026-07-01T00:00:00Z", icon_key: "food", id: ids.category, is_archived: false, is_default: true, kind: "expense", name: "Dining", updated_at: "2026-07-01T00:00:00Z" };
const goal = { archived_at: null, completed_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", id: ids.goal, monthly_target_amount: "250.0000", name: "House fund", note: "A calm place of our own.", progress: { is_target_met: false, percent_complete: "35.0000", remaining_amount: "6500.0000", saved_amount: "3500.0000" }, status: "active", target_amount: "10000.0000", target_date: "2027-10-01", updated_at: "2026-07-01T00:00:00Z" };
const budget = { archived_at: null, category_id: category.id, category_name: "Dining", created_at: "2026-07-01T00:00:00Z", currency: "USD", id: ids.budget, is_archived: false, limit_amount: "1000.0000", period_end: "2026-08-01", period_start: "2026-07-01", period_type: "monthly", progress: { percent_used: "42.5000", remaining_amount: "575.0000", spent_amount: "425.0000", status: "on_track" }, updated_at: "2026-07-01T00:00:00Z" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } }));
  await page.route("**/api/backend/budgets?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [budget], next_cursor: null } }));
  await page.route("**/api/backend/savings-goals?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [goal], next_cursor: null } }));
  await page.route(`**/api/backend/savings-goals/${ids.goal}`, async (route) => route.fulfill({ contentType: "application/json", json: goal }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [category], next_cursor: null } }));
});

test("shows live budget and goal summaries with meaningful detail paths", async ({ page }) => {
  await page.goto("/goal");
  await expect(page.getByText("House fund")).toBeVisible();
  await expect(page.getByText("$3,500.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "House fund progress" })).toHaveAttribute("aria-valuenow", "35");
  await page.getByRole("link", { name: /House fund/ }).click();
  await expect(page).toHaveURL(`/goal/${ids.goal}`);
  await expect(page.getByText("A calm place of our own.")).toBeVisible();

  await page.goto("/budget");
  await expect(page.getByText("Dining")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up budgets" })).toHaveAttribute("href", "/budget/setup");
});

test("creates and updates budget allocations, then deletes with a Drawer", async ({ page }) => {
  let createPayload: Record<string, unknown> | null = null;
  let updatePayload: Record<string, unknown> | null = null;
  let deleted = false;
  await page.route("**/api/backend/budgets", async (route) => { createPayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: { ...budget, category_id: null, category_name: null, id: "55555555-5555-5555-5555-555555555555" }, status: 201 }); });
  await page.route(`**/api/backend/budgets/${ids.budget}`, async (route) => { if (route.request().method() === "PATCH") updatePayload = route.request().postDataJSON() as Record<string, unknown>; if (route.request().method() === "DELETE") deleted = true; await route.fulfill({ contentType: "application/json", json: budget }); });
  await page.goto("/budget/setup");
  await page.getByLabel("Monthly budget").fill("1200");
  await page.getByLabel("Dining budget").fill("600");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page).toHaveURL("/budget");
  expect(createPayload).toMatchObject({ category_id: null, currency: "USD", limit_amount: "1200", period_type: "monthly" });
  expect(updatePayload).toMatchObject({ currency: "USD", limit_amount: "600" });

  await page.getByRole("button", { name: "Delete Dining budget" }).click();
  await expect(page.getByRole("dialog", { name: "Delete Dining budget?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete budget" }).click();
  expect(deleted).toBe(true);
});

test("creates and edits a savings goal on dedicated paths", async ({ page }) => {
  let createPayload: Record<string, unknown> | null = null;
  let updatePayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/savings-goals", async (route) => { createPayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: goal, status: 201 }); });
  await page.route(`**/api/backend/savings-goals/${ids.goal}`, async (route) => { if (route.request().method() === "PATCH") updatePayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: goal }); });
  await page.goto("/goal/new");
  await page.getByLabel("Goal name").fill("Emergency fund");
  await page.getByLabel("Target amount").fill("5000");
  await expect(page.getByLabel("Monthly target")).toBeDisabled();
  await expect(page.getByLabel("Target date")).toHaveAttribute("required", "");
  const targetDate = await page.evaluate(() => { const date = new Date(); date.setFullYear(date.getFullYear() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; });
  await page.getByLabel("Target date").fill(targetDate);
  await expect(page.getByLabel("Monthly target")).toHaveValue("416.6667");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page).toHaveURL(`/goal/${ids.goal}`);
  expect(createPayload).toMatchObject({ currency: "USD", monthly_target_amount: "416.6667", name: "Emergency fund", target_amount: "5000", target_date: targetDate });

  await page.getByRole("link", { name: "Edit goal" }).click();
  await expect(page.getByLabel("Monthly target")).toBeDisabled();
  const editedMonthlyTarget = await page.getByLabel("Monthly target").inputValue();
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page).toHaveURL(`/goal/${ids.goal}`);
  expect(updatePayload).toMatchObject({ monthly_target_amount: editedMonthlyTarget, name: "House fund", target_date: goal.target_date });
});

test("moves money from an account into a goal and deletes with a Drawer", async ({ page }) => {
  let transferPayload: Record<string, unknown> | null = null;
  let idempotency = "";
  let deleted = false;
  await page.route("**/api/backend/transactions/savings-transfers", async (route) => { transferPayload = route.request().postDataJSON() as Record<string, unknown>; idempotency = route.request().headers()["idempotency-key"] ?? ""; await route.fulfill({ contentType: "application/json", json: { amount: "125.0000", contribution_id: "55555555-5555-5555-5555-555555555555", created_at: "2026-07-16T00:00:00Z", currency: "USD", debit_transaction_id: "66666666-6666-6666-6666-666666666666", description: "Deposit", from_account_id: ids.account, id: "77777777-7777-7777-7777-777777777777", savings_goal_id: ids.goal, transaction_at: "2026-07-16T00:00:00Z" }, status: 201 }); });
  await page.route(`**/api/backend/savings-goals/${ids.goal}`, async (route) => { if (route.request().method() === "DELETE") deleted = true; await route.fulfill({ contentType: "application/json", json: goal }); });
  await page.goto(`/goal/${ids.goal}`);
  await page.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByRole("dialog", { name: "Add money to House fund" })).toBeVisible();
  await page.getByLabel("Contribution amount").fill("125");
  await page.getByLabel("Contribution note").fill("Deposit");
  await page.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByRole("dialog", { name: "Add money to House fund" })).toBeHidden();
  expect(transferPayload).toMatchObject({ amount: "125", description: "Deposit", from_account_id: ids.account, savings_goal_id: ids.goal });
  expect(idempotency).not.toBe("");

  await page.getByRole("button", { name: "Delete goal" }).click();
  await expect(page.getByRole("dialog", { name: "Delete House fund?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete goal" }).last().click();
  await expect(page).toHaveURL("/goal");
  expect(deleted).toBe(true);
});

test("handles empty, retryable, accessible planning views without overflow", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/backend/savings-goals?**", async (route) => { attempts += 1; if (attempts === 1) { await route.fulfill({ contentType: "application/json", json: { error: { message: "Unavailable" } }, status: 503 }); return; } await route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }); });
  await page.route("**/api/backend/budgets?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));
  await page.goto("/goal");
  await expect(page.getByText("Couldn’t load savings goals")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No active goals")).toBeVisible();
  await page.goto("/budget");
  await expect(page.getByText(/No budget for/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for budgets and goals`, async ({ page }) => {
    await page.goto("/budget");
    await page.evaluate((selectedTheme) => localStorage.setItem("pfm-mobile-theme", selectedTheme), theme);
    await page.reload();
    await expect(page.getByText("Dining")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`budget-${theme}.png`, { animations: "disabled", fullPage: true });
    await page.goto("/goal");
    await expect(page.getByText("House fund")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`goal-${theme}.png`, { animations: "disabled", fullPage: true });
  });
}
