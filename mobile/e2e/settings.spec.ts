import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = {
  account: "11111111-1111-1111-1111-111111111111",
  category: "22222222-2222-2222-2222-222222222222",
  person: "33333333-3333-3333-3333-333333333333",
  record: "44444444-4444-4444-4444-444444444444",
  rule: "55555555-5555-5555-5555-555555555555",
  notification: "66666666-6666-6666-6666-666666666666",
};

const account = { archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", current_balance: "2450.0000", disabled_at: null, id: ids.account, is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "2000.0000", type: "bank_account", updated_at: "2026-07-01T00:00:00Z" };
const category = { archived_at: null, created_at: "2026-07-01T00:00:00Z", icon_key: "food", id: ids.category, is_archived: false, is_default: false, kind: "expense", name: "Dining", updated_at: "2026-07-01T00:00:00Z" };
const incomeCategory = { ...category, id: "77777777-7777-7777-7777-777777777777", kind: "income", name: "Salary" };
const person = { archived_at: null, created_at: "2026-07-01T00:00:00Z", id: ids.person, name: "Alex Morgan", note: null, phone_number: "+12025550123", updated_at: "2026-07-01T00:00:00Z" };
const record = { account_id: ids.account, archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", direction: "given", id: ids.record, issued_at: "2026-07-01T00:00:00Z", note: null, outstanding_amount: "400.0000", person_id: ids.person, principal_amount: "500.0000", repay_date: "2026-08-14", settled_amount: "100.0000", settled_at: null, status: "open", updated_at: "2026-07-01T00:00:00Z" };
const rule = { account_id: ids.account, amount: "85.0000", archived_at: null, category_id: ids.category, created_at: "2026-07-01T00:00:00Z", currency: "USD", description: "Internet bill", end_at: null, frequency: "monthly", id: ids.rule, interval_count: 1, last_paid_period: null, last_received_period: null, last_run_at: null, last_run_key: null, next_run_at: "2026-08-01T08:00:00Z", paused_at: null, run_count: 0, start_at: "2026-07-01T08:00:00Z", status: "active", timezone: "UTC", transaction_type: "expense", updated_at: "2026-07-01T00:00:00Z" };
const notification = { created_at: "2026-07-15T08:30:00Z", email_delivery_status: "not_requested", email_requested_at: null, email_sent_at: null, id: ids.notification, message: "Your Dining budget has reached 80%.", payload: {}, read_at: null, title: "Budget alert", type: "budget_threshold", updated_at: "2026-07-15T08:30:00Z", user_id: "88888888-8888-8888-8888-888888888888" };
const profile = { about: "Planning one calm month at a time.", base_currency: "USD", base_currency_changed_at: null, created_at: "2026-01-01T00:00:00Z", email: "morgan@example.com", full_name: "Morgan Lee", home_balance_source_id: null, home_balance_source_type: null, id: "88888888-8888-8888-8888-888888888888", is_active: true, occupation: "Designer", phone_number: "+12025550100" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/users/me", async (route) => route.fulfill({ contentType: "application/json", json: route.request().method() === "PATCH" ? { ...profile, ...route.request().postDataJSON() } : profile }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [category, incomeCategory], next_cursor: null } }));
  await page.route("**/api/backend/loans/summary", async (route) => route.fulfill({ contentType: "application/json", json: { currency: "USD", due_loan: "400.0000", total_loan_given: "500.0000", total_loan_taken: "0.0000" } }));
  await page.route("**/api/backend/loans/people?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [person], next_cursor: null } }));
  await page.route("**/api/backend/loans/records?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [record], next_cursor: null } }));
  await page.route("**/api/backend/recurring-rules?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [rule], next_cursor: null } }));
  await page.route("**/api/backend/notifications?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [notification], next_cursor: null } }));
});

test("updates the authenticated profile", async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/users/me", async (route) => { if (route.request().method() === "PATCH") payload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: payload ? { ...profile, ...payload } : profile }); });
  await page.goto("/settings?section=profile");
  await page.getByLabel("Full name").fill("Morgan Park");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
  expect(payload).toMatchObject({ full_name: "Morgan Park", base_currency: "USD" });
});

test("creates accounts and categories with backend-shaped payloads", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/backend/accounts", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: account, status: 201 }); });
  await page.route("**/api/backend/categories", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: category, status: 201 }); });
  await page.goto("/settings?section=accounts");
  await page.getByLabel("Account name").fill("Travel cash");
  await page.getByLabel("Opening balance").fill("350");
  await page.getByRole("button", { name: "Add account" }).click();
  await page.getByRole("button", { name: "Categories" }).click();
  await page.getByLabel("Name").fill("Books");
  await page.getByRole("button", { name: "Add category" }).click();
  expect(payloads[0]).toMatchObject({ name: "Travel cash", opening_balance: "350", type: "bank_account" });
  expect(payloads[1]).toMatchObject({ kind: "expense", name: "Books" });
});

test("creates a loan contact, loan record, and settlement", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/backend/loans/people", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: person, status: 201 }); });
  await page.route("**/api/backend/loans/records", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: record, status: 201 }); });
  await page.route(`**/api/backend/loans/records/${ids.record}/settlements`, async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: { account_id: ids.account, amount: "50.0000", created_at: "2026-07-15T00:00:00Z", currency: "USD", id: "99999999-9999-9999-9999-999999999999", note: null, record_id: ids.record, settled_at: "2026-07-15T00:00:00Z" }, status: 201 }); });
  await page.goto("/settings?section=loans");
  await page.getByLabel("Name").fill("Jamie Doe"); await page.getByLabel("Phone").fill("+12025550155"); await page.getByRole("button", { name: "Add person" }).click();
  await page.getByLabel("Amount").fill("500"); await page.getByRole("button", { name: "Create loan" }).click();
  await page.getByLabel("Settlement for Alex Morgan").fill("50"); await page.getByRole("button", { name: "Record" }).click();
  expect(payloads[0]).toMatchObject({ name: "Jamie Doe", phone_number: "+12025550155" });
  expect(payloads[1]).toMatchObject({ account_id: ids.account, principal_amount: "500" });
  expect(payloads[2]).toMatchObject({ account_id: ids.account, amount: "50" });
});

test("creates and pauses a recurring transaction", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/backend/recurring-rules", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: rule, status: 201 }); });
  await page.route(`**/api/backend/recurring-rules/${ids.rule}/pause`, async (route) => { await route.fulfill({ contentType: "application/json", json: { ...rule, paused_at: "2026-07-15T00:00:00Z", status: "paused" } }); });
  await page.goto("/settings?section=recurring");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByLabel("Amount").fill("85"); await page.getByLabel("Description").fill("Internet bill"); await page.getByRole("button", { name: "Create schedule" }).click();
  expect(payloads[0]).toMatchObject({ account_id: ids.account, amount: "85", category_id: ids.category, frequency: "monthly", transaction_type: "expense" });
});

test("manages notifications in an accessible, overflow-free mobile view", async ({ page }) => {
  await page.route(`**/api/backend/notifications/${ids.notification}/read`, async (route) => route.fulfill({ contentType: "application/json", json: { ...notification, read_at: "2026-07-15T09:00:00Z" } }));
  await page.goto("/settings?section=notifications");
  await expect(page.getByText("Budget alert")).toBeVisible();
  await page.getByRole("button", { name: "Mark Budget alert read" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
