import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = {
  account: "11111111-1111-1111-1111-111111111111",
  secondAccount: "22222222-2222-2222-2222-222222222222",
};

const profile = {
  about: null, base_currency: "USD", base_currency_changed_at: null, created_at: "2026-07-15T00:00:00Z", email: "mobile@example.com",
  full_name: "Mobile User", home_balance_source_id: null, home_balance_source_type: null, id: "33333333-3333-3333-3333-333333333333",
  is_active: true, occupation: null, phone_number: null,
};

const account = {
  archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", current_balance: "2450.0000", disabled_at: null,
  id: ids.account, is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "2000.0000", type: "bank_account", updated_at: "2026-07-01T00:00:00Z",
};

test("guides a new user through currency and their first account", async ({ page }) => {
  let accounts: typeof account[] = [];
  let accountPayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/users/me", async (route) => route.fulfill({ contentType: "application/json", json: route.request().method() === "PATCH" ? { ...profile, ...route.request().postDataJSON() } : profile }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: accounts, next_cursor: null } }));
  await page.route("**/api/backend/accounts", async (route) => {
    accountPayload = route.request().postDataJSON() as Record<string, unknown>;
    accounts = [{ ...account, ...accountPayload }];
    await route.fulfill({ contentType: "application/json", json: accounts[0], status: 201 });
  });

  await page.goto("/setup");
  await page.getByLabel("Home currency").fill("EUR");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Add your first account" }).click();
  await expect(page).toHaveURL(/\/accounts\/new\?next=\/setup&currency=EUR$/);
  await page.getByLabel("Account name").fill("Main cash");
  await page.getByLabel("Opening balance").fill("250");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByText("Main cash is ready")).toBeVisible();
  expect(accountPayload).toMatchObject({ currency: "EUR", name: "Main cash", opening_balance: "250", type: "bank_account" });
});

test("manages an account through its detail page and guarded Drawer removal", async ({ page }) => {
  let current: Omit<typeof account, "disabled_at"> & { disabled_at: string | null } = account;
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [current], next_cursor: null } }));
  await page.route(`**/api/backend/accounts/${ids.account}/delete-eligibility`, async (route) => route.fulfill({ contentType: "application/json", json: { account_id: ids.account, can_delete: false, reasons: ["transaction"] } }));
  await page.route(`**/api/backend/accounts/${ids.account}/disable`, async (route) => { current = { ...current, disabled_at: "2026-07-15T00:00:00Z", is_default: false, is_disabled: true }; await route.fulfill({ contentType: "application/json", json: current }); });
  await page.route(`**/api/backend/accounts/${ids.account}`, async (route) => route.fulfill({ contentType: "application/json", json: current }));

  await page.goto("/accounts");
  await page.getByRole("link", { name: /Daily wallet/ }).click();
  await expect(page.getByRole("heading", { name: "Account details" })).toBeVisible();
  await page.getByRole("button", { name: "Disable account" }).click();
  await expect(page.getByText("Disabled")).toBeVisible();
  await page.getByRole("button", { name: "Remove account" }).click();
  const drawer = page.getByRole("dialog", { name: "Remove this account?" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("This account is linked to transactions.")).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Remove account" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("uses the default account rather than the aggregate report balance on Home", async ({ page }) => {
  const dashboard = {
    available_balance: "9999.0000", buckets: [], currency: "USD", expense_amount: "0", income_amount: "0", net_flow_amount: "0", period: "month",
    range: { end_at: "2026-08-01T00:00:00Z", start_at: "2026-07-01T00:00:00Z", timezone: "UTC" }, type: "expense",
  };
  await page.route("**/api/backend/reports/dashboard**", async (route) => route.fulfill({ contentType: "application/json", json: dashboard }));
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [{ ...account, current_balance: "2450.0000" }, { ...account, id: ids.secondAccount, is_default: false, name: "Savings", current_balance: "7000.0000" }], next_cursor: null } }));
  await page.route("**/api/backend/transactions?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));

  await page.goto("/");
  await expect(page.getByText("$2,450.00")).toBeVisible();
  await expect(page.getByText("$9,999.00")).toHaveCount(0);
});
