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
const notification = { created_at: "2026-07-15T08:30:00Z", email_delivery_status: "not_requested", email_requested_at: null, email_sent_at: null, id: ids.notification, message: "Your Dining budget has reached 80%.", payload: { transaction_id: "99999999-9999-9999-9999-999999999998" }, read_at: null, title: "Budget alert", type: "budget_threshold", updated_at: "2026-07-15T08:30:00Z", user_id: "88888888-8888-8888-8888-888888888888" };
const profile = { about: "Planning one calm month at a time.", base_currency: "USD", base_currency_changed_at: null, created_at: "2026-01-01T00:00:00Z", email: "morgan@example.com", full_name: "Morgan Lee", home_balance_source_id: null, home_balance_source_type: null, id: "88888888-8888-8888-8888-888888888888", is_active: true, occupation: "Designer", phone_number: "+12025550100" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/users/me", async (route) => route.fulfill({ contentType: "application/json", json: route.request().method() === "PATCH" ? { ...profile, ...route.request().postDataJSON() } : profile }));
  await page.route("**/api/backend/auth/methods", async (route) => route.fulfill({ contentType: "application/json", json: { connected_providers: ["google"], password_enabled: false } }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } }));
  await page.route("**/api/backend/categories?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [category, incomeCategory], next_cursor: null } }));
  await page.route("**/api/backend/loans/summary", async (route) => route.fulfill({ contentType: "application/json", json: { currency: "USD", due_loan: "400.0000", total_loan_given: "500.0000", total_loan_taken: "0.0000" } }));
  await page.route("**/api/backend/loans/people?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [person], next_cursor: null } }));
  await page.route("**/api/backend/loans/records?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [record], next_cursor: null } }));
  await page.route("**/api/backend/recurring-rules?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [rule], next_cursor: null } }));
  await page.route("**/api/backend/recurring-rules/due-expenses", async (route) => route.fulfill({ contentType: "application/json", json: { items: [] } }));
  await page.route("**/api/backend/recurring-rules/due-incomes", async (route) => route.fulfill({ contentType: "application/json", json: { items: [] } }));
  await page.route("**/api/backend/notifications?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [notification], next_cursor: null } }));
  await page.route("**/api/backend/notifications/unread-count", async (route) => route.fulfill({ contentType: "application/json", json: { unread_count: 1 } }));
});

test("updates the authenticated profile", async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/users/me", async (route) => { if (route.request().method() === "PATCH") payload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: payload ? { ...profile, ...payload } : profile }); });
  await page.goto("/profile");
  await page.getByLabel("Full name").fill("Morgan Park");
  await page.getByLabel("Email").fill("morgan.park@example.com");
  await page.getByLabel("Occupation").selectOption("business");
  await expect(page.getByText("Base currency")).toHaveCount(0);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
  expect(payload).toMatchObject({ full_name: "Morgan Park", email: "morgan.park@example.com", occupation: "business" });
  expect(payload).not.toHaveProperty("base_currency");
});

test("creates accounts and categories with backend-shaped payloads", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/backend/accounts", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: account, status: 201 }); });
  await page.route("**/api/backend/categories", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: category, status: 201 }); });
  await page.goto("/accounts/new");
  await page.getByLabel("Account name").fill("Travel cash");
  await page.getByLabel("Opening balance").fill("350");
  await page.getByRole("button", { name: "Add account" }).click();
  await page.goto("/settings/categories");
  await page.getByRole("link", { name: "New category" }).click();
  await page.getByLabel("Category name").fill("Books");
  await page.getByRole("button", { name: "Create category" }).click();
  expect(payloads[0]).toMatchObject({ name: "Travel cash", opening_balance: "350", type: "bank_account" });
  expect(payloads[1]).toMatchObject({ kind: "expense", name: "Books" });
});

test("uses clear settings paths and edits and archives a custom category in a drawer", async ({ page }) => {
  let updatePayload: Record<string, unknown> | null = null;
  let archived = false;
  await page.route(`**/api/backend/categories/${ids.category}`, async (route) => {
    if (route.request().method() === "PATCH") updatePayload = route.request().postDataJSON() as Record<string, unknown>;
    if (route.request().method() === "DELETE") archived = true;
    await route.fulfill({ contentType: "application/json", json: { ...category, ...(updatePayload ?? {}), is_archived: archived } });
  });

  await page.goto("/settings");
  await expect(page.getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/profile");
  await expect(page.getByRole("link", { name: /Sign-in & security/ })).toHaveAttribute("href", "/settings/security");
  await expect(page.getByRole("link", { name: /Accounts/ })).toHaveAttribute("href", "/accounts");
  await expect(page.getByRole("link", { name: /Categories/ })).toHaveAttribute("href", "/settings/categories");
  await page.getByRole("link", { name: /Categories/ }).click();
  await page.getByRole("link", { name: /Dining/ }).click();
  await expect(page).toHaveURL(`/settings/categories/${ids.category}/edit`);
  await page.getByLabel("Category name").fill("Eating out");
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(page).toHaveURL("/settings/categories");
  expect(updatePayload).toMatchObject({ icon_key: "food", kind: "expense", name: "Eating out" });

  await page.goto(`/settings/categories/${ids.category}/edit`);
  await page.getByRole("button", { name: "Archive category" }).click();
  const drawer = page.getByRole("dialog", { name: "Archive Dining?" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/past records keep their category/i)).toBeVisible();
  await drawer.getByRole("button", { name: "Archive category" }).click();
  await expect(page).toHaveURL("/settings/categories");
  expect(archived).toBe(true);
});

test("shows connected sign-in methods and explicitly links another provider", async ({ page }) => {
  let linkedProvider: string | null = null;
  await page.route("**/api/backend/auth/methods", async (route) => route.fulfill({ contentType: "application/json", json: { connected_providers: linkedProvider ? ["google", "github"] : ["google"], password_enabled: false } }));
  await page.route("**/api/auth/oauth/github/link", async (route) => {
    linkedProvider = "github";
    await route.fulfill({
      contentType: "application/json",
      json: { redirect_url: "/settings/security?provider=github&oauth_link=connected" },
    });
  });

  await page.goto("/settings/security");
  await expect(page.getByText("Google", { exact: true })).toBeVisible();
  await expect(page.getByText("Connected to this account")).toBeVisible();
  await page.getByRole("button", { name: "Connect GitHub" }).click();

  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByText("GitHub is now connected to this account.")).toBeVisible();
  expect(linkedProvider).toBe("github");
});

test("shows actionable provider-link failures without a misleading success", async ({ page }) => {
  const failures = [
    ["provider_in_use", "That GitHub identity is already connected to another PFM account."],
    ["already_linked", "GitHub is already connected to this account with a different identity."],
    ["callback_failed", "GitHub could not be connected. Please try again."],
  ] as const;

  for (const [result, message] of failures) {
    await page.goto(`/settings/security?provider=github&oauth_link=${result}`);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }

  await page.goto("/settings/security?provider=unsupported&oauth_link=connected");
  await expect(page.getByText(/is now connected to this account/)).toHaveCount(0);
  await page.goto("/settings/security?provider=github&oauth_link=connected");
  await expect(page.getByText("GitHub is now connected to this account.")).toHaveCount(0);

  await page.route("**/api/auth/oauth/github/link", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { error: { message: "GitHub connection was rejected." } },
      status: 409,
    });
  });
  await page.goto("/settings/security");
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await expect(page.getByText("GitHub connection was rejected.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/security$/);
});

test("returns to authentication when security state loses its session", async ({ page }) => {
  await page.route("**/api/backend/auth/methods", async (route) => route.fulfill({
    contentType: "application/json",
    json: { error: { message: "Authentication required" } },
    status: 401,
  }));

  await page.goto("/settings/security");

  await expect(page).toHaveURL(/\/auth\?next=%2Fsettings%2Fsecurity$/);
});

test("labels each available provider connection accessibly", async ({ page }) => {
  await page.route("**/api/backend/auth/methods", async (route) => route.fulfill({
    contentType: "application/json",
    json: { connected_providers: [], password_enabled: false },
  }));

  await page.goto("/settings/security");

  await expect(page.getByRole("button", { name: "Connect Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect GitHub" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("sets a first password and requires a fresh email sign-in", async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await page.route("**/api/auth/password", async (route) => {
    payload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ contentType: "application/json", json: { reauthentication_required: true, status: "updated" } });
  });

  await page.goto("/settings/security");
  await page.getByLabel("New password", { exact: true }).fill("NewCorrectHorse42");
  await page.getByLabel("Confirm new password").fill("NewCorrectHorse42");
  await page.getByRole("button", { name: "Set password" }).click();

  await expect(page).toHaveURL(/\/auth\/login\?password_updated=1/);
  await expect(page.getByText("Password updated. Sign in again with your email and new password.")).toBeVisible();
  expect(payload).toEqual({ newPassword: "NewCorrectHorse42" });
});

test("requires the current password when changing an existing password", async ({ page }) => {
  await page.route("**/api/backend/auth/methods", async (route) => route.fulfill({ contentType: "application/json", json: { connected_providers: ["google", "github"], password_enabled: true } }));
  await page.goto("/settings/security");

  await expect(page.getByLabel("Current password")).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("AnotherHorse42");
  await page.getByLabel("Confirm new password").fill("AnotherHorse42");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Enter your current password.")).toBeVisible();
});

test("keeps profile, settings, and categories accessible and overflow-free", async ({ page }) => {
  for (const route of ["/settings", "/settings/security", "/profile", "/settings/categories"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test("creates a loan contact, loan record, and settlement", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/backend/loans/people", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: person, status: 201 }); });
  await page.route("**/api/backend/loans/records", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: record, status: 201 }); });
  await page.route(`**/api/backend/loans/records/${ids.record}`, async (route) => route.fulfill({ contentType: "application/json", json: record }));
  await page.route(`**/api/backend/loans/records/${ids.record}/settlements?**`, async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));
  await page.route(`**/api/backend/loans/records/${ids.record}/settlements`, async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: { account_id: ids.account, amount: "50.0000", created_at: "2026-07-15T00:00:00Z", currency: "USD", id: "99999999-9999-9999-9999-999999999999", note: null, record_id: ids.record, settled_at: "2026-07-15T00:00:00Z" }, status: 201 }); });
  await page.goto("/loan/people/new");
  await page.getByLabel("Person name").fill("Jamie Doe"); await page.getByLabel("Person phone").fill("+12025550155"); await page.getByRole("button", { name: "Add contact" }).click();
  await page.goto("/loan/new");
  await page.getByLabel("Loan amount").fill("500"); await page.getByLabel("Repayment date").fill("2026-08-14"); await page.getByRole("button", { name: "Create given loan" }).click();
  await page.getByRole("button", { name: "Record settlement" }).click();
  await page.getByLabel("Settlement amount").fill("50"); await page.getByRole("button", { name: "Record settlement" }).last().click();
  expect(payloads[0]).toMatchObject({ name: "Jamie Doe", phone_number: "+12025550155" });
  expect(payloads[1]).toMatchObject({ account_id: ids.account, principal_amount: "500" });
  expect(payloads[2]).toMatchObject({ account_id: ids.account, amount: "50" });
});

test("creates, edits, pauses, resumes, and deletes a recurring transaction", async ({ page }) => {
  const createPayloads: Record<string, unknown>[] = [];
  let updatePayload: Record<string, unknown> | null = null;
  let deleted = false;
  let currentRule: Omit<typeof rule, "paused_at"> & { paused_at: string | null } = rule;
  await page.route("**/api/backend/recurring-rules", async (route) => { createPayloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: rule, status: 201 }); });
  await page.route(`**/api/backend/recurring-rules/${ids.rule}`, async (route) => {
    if (route.request().method() === "PATCH") {
      updatePayload = route.request().postDataJSON() as Record<string, unknown>;
      currentRule = { ...currentRule, ...updatePayload } as typeof currentRule;
    }
    if (route.request().method() === "DELETE") deleted = true;
    await route.fulfill({ contentType: "application/json", json: currentRule });
  });
  await page.route(`**/api/backend/recurring-rules/${ids.rule}/pause`, async (route) => { currentRule = { ...rule, paused_at: "2026-07-15T00:00:00Z", status: "paused" }; await route.fulfill({ contentType: "application/json", json: currentRule }); });
  await page.route(`**/api/backend/recurring-rules/${ids.rule}/resume`, async (route) => { currentRule = { ...rule, paused_at: null, status: "active" }; await route.fulfill({ contentType: "application/json", json: currentRule }); });
  await page.goto("/transaction/recurring");
  await page.getByRole("link", { name: /Internet bill/ }).click();
  await page.getByRole("button", { name: "Pause schedule" }).click();
  await expect(page.getByRole("button", { name: "Resume schedule" })).toBeVisible();
  await page.getByRole("button", { name: "Resume schedule" }).click();
  await expect(page.getByRole("button", { name: "Pause schedule" })).toBeVisible();
  await page.getByRole("link", { name: "Edit schedule" }).click();
  await page.getByLabel("Amount").fill("90");
  await page.getByRole("button", { name: "Save schedule" }).click();
  await expect(page).toHaveURL(`/transaction/recurring/${ids.rule}`);
  expect(updatePayload).toMatchObject({ amount: "90" });
  await page.getByRole("button", { name: "Delete schedule" }).click();
  await expect(page.getByText("Delete this recurring item?")).toBeVisible();
  await page.getByRole("button", { name: "Delete schedule" }).last().click();
  await expect(page).toHaveURL("/transaction/recurring");
  expect(deleted).toBe(true);
  await page.goto("/transaction/recurring/new");
  await page.getByLabel("Amount").fill("85"); await page.getByLabel("Note").fill("Internet bill"); await page.getByRole("button", { name: "Create schedule" }).click();
  expect(createPayloads[0]).toMatchObject({ account_id: ids.account, amount: "85", category_id: ids.category, frequency: "monthly", transaction_type: "expense" });
});

test("confirms due recurring expense and income before balances change", async ({ page }) => {
  let expenseItems = [{ due_at: "2026-07-15T08:00:00Z", period_key: "2026-07", reminder_key: "expense:2026-07", rule }];
  const incomeRule = { ...rule, category_id: incomeCategory.id, description: "Monthly salary", id: "55555555-5555-5555-5555-555555555556", transaction_type: "income" };
  let incomeItems = [{ due_at: "2026-07-15T09:00:00Z", period_key: "2026-07", reminder_key: "income:2026-07", rule: incomeRule }];
  let paidPayload: Record<string, unknown> | null = null; let receivedPayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/recurring-rules/due-expenses", async (route) => route.fulfill({ contentType: "application/json", json: { items: expenseItems } }));
  await page.route("**/api/backend/recurring-rules/due-incomes", async (route) => route.fulfill({ contentType: "application/json", json: { items: incomeItems } }));
  await page.route(`**/api/backend/recurring-rules/${ids.rule}/paid`, async (route) => { paidPayload = route.request().postDataJSON() as Record<string, unknown>; expenseItems = []; await route.fulfill({ contentType: "application/json", json: { rule, transaction: {} } }); });
  await page.route(`**/api/backend/recurring-rules/${incomeRule.id}/received`, async (route) => { receivedPayload = route.request().postDataJSON() as Record<string, unknown>; incomeItems = []; await route.fulfill({ contentType: "application/json", json: { rule: incomeRule, transaction: {} } }); });
  await page.goto("/transaction/recurring");
  await page.getByRole("button", { name: /Internet bill/ }).click();
  await page.getByRole("button", { name: "Mark paid" }).click();
  await page.getByRole("button", { name: /Monthly salary/ }).click();
  await page.getByRole("button", { name: "Mark received" }).click();
  expect(paidPayload).toHaveProperty("paid_at"); expect(receivedPayload).toHaveProperty("received_at");
});

test("manages notifications in an accessible, overflow-free mobile view", async ({ page }) => {
  let currentNotification: Omit<typeof notification, "read_at"> & { read_at: string | null } = notification;
  await page.route("**/api/backend/notifications?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [currentNotification], next_cursor: null } }));
  await page.route(`**/api/backend/notifications/${ids.notification}/read`, async (route) => { currentNotification = { ...notification, read_at: "2026-07-15T09:00:00Z" }; await route.fulfill({ contentType: "application/json", json: currentNotification }); });
  await page.goto("/notifications");
  await expect(page.getByText("Budget alert")).toBeVisible();
  await expect(page.getByRole("link", { name: /View details/ })).toHaveAttribute("href", "/transaction/99999999-9999-9999-9999-999999999998");
  await page.getByRole("button", { name: "Mark read" }).click();
  await expect(page.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for recurring and notifications`, async ({ page }) => {
    await page.goto("/transaction/recurring");
    await page.evaluate((selectedTheme) => localStorage.setItem("pfm-mobile-theme", selectedTheme), theme);
    await page.reload();
    await expect(page.getByText("Internet bill")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`recurring-${theme}.png`, { animations: "disabled", fullPage: true });
    await page.goto("/notifications");
    await expect(page.getByText("Budget alert")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`notifications-${theme}.png`, { animations: "disabled", fullPage: true });
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for profile, settings, and categories`, async ({ page }) => {
    await page.goto("/settings");
    await page.evaluate((selectedTheme) => localStorage.setItem("pfm-mobile-theme", selectedTheme), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Make the app feel like yours." })).toBeVisible();
    await expect(page).toHaveScreenshot(`settings-${theme}.png`, { animations: "disabled", fullPage: true });

    await page.goto("/profile");
    await expect(page.getByLabel("Full name")).toHaveValue("Morgan Lee");
    await expect(page).toHaveScreenshot(`profile-${theme}.png`, { animations: "disabled", fullPage: true });

    await page.goto("/settings/categories");
    await expect(page.getByText("Dining", { exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot(`categories-${theme}.png`, { animations: "disabled", fullPage: true });
  });
}
