import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = {
  account: "11111111-1111-1111-1111-111111111111",
  category: "22222222-2222-2222-2222-222222222222",
  goal: "33333333-3333-3333-3333-333333333333",
  person: "44444444-4444-4444-4444-444444444444",
};

const account = { archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", current_balance: "500.0000", disabled_at: null, id: ids.account, is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "500.0000", type: "bank_account", updated_at: "2026-07-01T00:00:00Z" };
const category = { archived_at: null, created_at: "2026-07-01T00:00:00Z", icon_key: "tag", id: ids.category, is_archived: false, is_default: false, kind: "expense", name: "Books", updated_at: "2026-07-01T00:00:00Z" };
const person = { archived_at: null, created_at: "2026-07-01T00:00:00Z", id: ids.person, name: "Jamie Doe", note: null, phone_number: "+12025550155", updated_at: "2026-07-01T00:00:00Z" };
const profile = { about: null, base_currency: "USD", base_currency_changed_at: null, created_at: "2026-07-01T00:00:00Z", email: "guide@example.com", full_name: "Guide User", home_balance_source_id: null, home_balance_source_type: null, id: "55555555-5555-5555-5555-555555555555", is_active: true, occupation: null, phone_number: null };
const goal = { archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", id: ids.goal, monthly_target_amount: "100.0000", name: "Emergency fund", note: null, progress: { percent_complete: "10", remaining_amount: "900.0000", saved_amount: "100.0000" }, status: "active", target_amount: "1000.0000", target_date: "2026-12-31", updated_at: "2026-07-01T00:00:00Z" };
const emptyList = { has_more: false, items: [], next_cursor: null };

test("guides transaction setup through account and category paths, then returns", async ({ page }) => {
  let accounts: typeof account[] = [];
  let categories: typeof category[] = [];
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: accounts } }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: categories } }));
  await page.route("**/api/backend/accounts", async (route) => { accounts = [account]; await route.fulfill({ contentType: "application/json", json: account, status: 201 }); });
  await page.route("**/api/backend/categories", async (route) => { categories = [category]; await route.fulfill({ contentType: "application/json", json: category, status: 201 }); });

  await page.goto("/transaction/new?type=expense");
  await expect(page.getByText("Finish setup to continue")).toBeVisible();
  await page.getByRole("link", { name: "Add account" }).click();
  await page.getByLabel("Account name").fill("Daily wallet");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page).toHaveURL("/transaction/new?type=expense");

  await page.getByRole("link", { name: "Add expense category" }).click();
  await expect(page).toHaveURL(/\/settings\/categories\/new\?kind=expense/);
  await page.getByLabel("Category name").fill("Books");
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page).toHaveURL("/transaction/new?type=expense");
  await expect(page.getByRole("button", { name: "Save expense" })).toBeEnabled();
});

test("returns from loan contact and account setup to the unfinished loan", async ({ page }) => {
  let accounts: typeof account[] = [];
  let people: typeof person[] = [];
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: accounts } }));
  await page.route("**/api/backend/loans/people?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: people } }));
  await page.route("**/api/backend/loans/people", async (route) => { people = [person]; await route.fulfill({ contentType: "application/json", json: person, status: 201 }); });
  await page.route("**/api/backend/accounts", async (route) => { accounts = [account]; await route.fulfill({ contentType: "application/json", json: account, status: 201 }); });

  await page.goto("/loan/new");
  await expect(page.getByText("Finish loan setup")).toBeVisible();
  await page.getByRole("link", { name: "Add loan contact" }).click();
  await page.getByLabel("Person name").fill("Jamie Doe");
  await page.getByLabel("Person phone").fill("+12025550155");
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(page).toHaveURL("/loan/new");

  await page.getByRole("link", { name: "Add account" }).click();
  await page.getByLabel("Account name").fill("Daily wallet");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page).toHaveURL("/loan/new");
  await expect(page.getByRole("button", { name: "Create given loan" })).toBeEnabled();
});

test("offers matching setup paths for recurring items", async ({ page }) => {
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: [account] } }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: emptyList }));

  await page.goto("/transaction/recurring/new");
  await expect(page.getByText("Finish setup to schedule this")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add expense category" })).toHaveAttribute("href", /kind=expense.*next=/);
  await expect(page.getByRole("button", { name: "Create schedule" })).toBeDisabled();
});

test("links a goal contribution to an account in the required currency", async ({ page }) => {
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: emptyList }));
  await page.route(`**/api/backend/savings-goals/${ids.goal}`, async (route) => route.fulfill({ contentType: "application/json", json: goal }));

  await page.goto(`/goal/${ids.goal}`);
  await page.getByRole("button", { name: "Add money" }).click();
  const drawer = page.getByRole("dialog", { name: "Add money to Emergency fund" });
  await expect(drawer.getByRole("link", { name: "Add a USD account" })).toHaveAttribute("href", `/accounts/new?currency=USD&next=%2Fgoal%2F${ids.goal}`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("keeps setup and account paths free of nested landmarks and overflow", async ({ page }) => {
  await page.route("**/api/backend/users/me", async (route) => route.fulfill({ contentType: "application/json", json: profile }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { ...emptyList, items: [account] } }));

  for (const route of ["/setup", "/accounts", "/accounts/new"]) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
