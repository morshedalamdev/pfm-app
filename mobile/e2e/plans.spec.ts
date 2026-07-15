import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const category = { archived_at: null, created_at: "2026-07-01T00:00:00Z", icon_key: "food", id: "11111111-1111-1111-1111-111111111111", is_archived: false, is_default: true, kind: "expense", name: "Dining", updated_at: "2026-07-01T00:00:00Z" };
const goal = { archived_at: null, completed_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", id: "22222222-2222-2222-2222-222222222222", monthly_target_amount: "250.0000", name: "House fund", note: null, progress: { is_target_met: false, percent_complete: "35.0000", remaining_amount: "6500.0000", saved_amount: "3500.0000" }, status: "active", target_amount: "10000.0000", target_date: "2027-10-01", updated_at: "2026-07-01T00:00:00Z" };
const budget = { archived_at: null, category_id: category.id, category_name: "Dining", created_at: "2026-07-01T00:00:00Z", currency: "USD", id: "33333333-3333-3333-3333-333333333333", is_archived: false, limit_amount: "1000.0000", period_end: "2026-08-01", period_start: "2026-07-01", period_type: "monthly", progress: { percent_used: "42.5000", remaining_amount: "575.0000", spent_amount: "425.0000", status: "on_track" }, updated_at: "2026-07-01T00:00:00Z" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/budgets?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [budget], next_cursor: null } }));
  await page.route("**/api/backend/savings-goals?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [goal], next_cursor: null } }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [category], next_cursor: null } }));
});

test("renders live savings goals and monthly budgets", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByText("House fund")).toBeVisible();
  await expect(page.getByText("Dining").last()).toBeVisible();
  await expect(page.getByText("$3,500.00")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "House fund progress" })).toHaveAttribute("aria-valuenow", "35");
});

test("creates a savings goal and a monthly budget", async ({ page }) => {
  const created: Record<string, unknown>[] = [];
  await page.route("**/api/backend/savings-goals", async (route) => { created.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: goal, status: 201 }); });
  await page.route("**/api/backend/budgets", async (route) => { created.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: budget, status: 201 }); });
  await page.goto("/plan");
  await page.getByRole("button", { name: "Create a plan" }).click();
  await page.getByLabel("Goal name").fill("Emergency fund");
  await page.getByLabel("Target amount").fill("5000");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await page.getByRole("button", { name: "Create a plan" }).click();
  await page.getByRole("button", { name: "Budget" }).click();
  await page.getByLabel("Budget limit").fill("800");
  await page.getByLabel("Budget category").selectOption(category.id);
  await page.getByRole("button", { name: "Create budget" }).click();

  expect(created[0]).toMatchObject({ name: "Emergency fund", target_amount: "5000" });
  expect(created[1]).toMatchObject({ category_id: category.id, limit_amount: "800", period_type: "monthly" });
});

test("adds a savings contribution", async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await page.route(`**/api/backend/savings-goals/${goal.id}/contributions`, async (route) => { payload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: { amount: "125.0000", contributed_at: "2026-07-15T00:00:00Z", created_at: "2026-07-15T00:00:00Z", currency: "USD", goal_id: goal.id, id: "44444444-4444-4444-4444-444444444444", note: null }, status: 201 }); });
  await page.goto("/plan");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Contribution amount for House fund").fill("125");
  await page.getByRole("button", { name: "Add money" }).click();
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
  expect(payload).toMatchObject({ amount: "125" });
});

test("handles empty, retryable, accessible mobile plans", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/backend/budgets?**", async (route) => { attempts += 1; if (attempts === 1) { await route.fulfill({ contentType: "application/json", json: { error: { message: "Unavailable" } }, status: 503 }); return; } await route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }); });
  await page.route("**/api/backend/savings-goals?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));
  await page.goto("/plan");
  await expect(page.getByText("Couldn’t load your plans")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No active savings goals yet. Create one to start tracking progress.")).toBeVisible();
  await expect(page.getByText("No budgets for this month. Create one to set a spending limit.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
