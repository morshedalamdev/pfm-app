import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ids = { account: "11111111-1111-1111-1111-111111111111", person: "22222222-2222-2222-2222-222222222222", record: "33333333-3333-3333-3333-333333333333", settlement: "44444444-4444-4444-4444-444444444444" };
const account = { archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", current_balance: "2450.0000", disabled_at: null, id: ids.account, is_archived: false, is_default: true, is_disabled: false, name: "Daily wallet", opening_balance: "2000.0000", type: "bank_account", updated_at: "2026-07-01T00:00:00Z" };
const person = { archived_at: null, created_at: "2026-07-01T00:00:00Z", id: ids.person, name: "Alex Morgan", note: "College friend", phone_number: "+12025550123", updated_at: "2026-07-01T00:00:00Z" };
const record = { account_id: ids.account, archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", direction: "given", id: ids.record, issued_at: "2026-07-01T00:00:00Z", note: "Moving costs", outstanding_amount: "400.0000", person_id: ids.person, principal_amount: "500.0000", repay_date: "2026-08-14", settled_amount: "100.0000", settled_at: null, status: "open", updated_at: "2026-07-01T00:00:00Z" };
const settlement = { account_id: ids.account, amount: "100.0000", created_at: "2026-07-10T00:00:00Z", currency: "USD", id: ids.settlement, note: "First payment", record_id: ids.record, settled_at: "2026-07-10T00:00:00Z" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/accounts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [account], next_cursor: null } }));
  await page.route("**/api/backend/loans/summary", async (route) => route.fulfill({ contentType: "application/json", json: { currency: "USD", due_loan: "400.0000", total_loan_given: "500.0000", total_loan_taken: "0.0000" } }));
  await page.route("**/api/backend/loans/people?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [person], next_cursor: null } }));
  await page.route("**/api/backend/loans/records?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [record], next_cursor: null } }));
  await page.route(`**/api/backend/loans/records/${ids.record}`, async (route) => route.fulfill({ contentType: "application/json", json: record }));
  await page.route(`**/api/backend/loans/records/${ids.record}/settlements?**`, async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [settlement], next_cursor: null } }));
});

test("shows searchable loan summaries and meaningful detail paths", async ({ page }) => {
  await page.goto("/loan");
  await expect(page.getByText("Alex Morgan")).toBeVisible();
  await expect(page.getByText("$400.00", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Search loans").fill("missing");
  await expect(page.getByText("No loan records")).toBeVisible();
  await page.getByLabel("Search loans").fill("Alex");
  await page.getByRole("link", { name: /Alex Morgan/ }).click();
  await expect(page).toHaveURL(`/loan/${ids.record}`);
  await expect(page.getByText("First payment")).toBeVisible();
});

test("creates and edits a loan record on dedicated paths", async ({ page }) => {
  let createPayload: Record<string, unknown> | null = null; let updatePayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/loans/records", async (route) => { createPayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: record, status: 201 }); });
  await page.route(`**/api/backend/loans/records/${ids.record}`, async (route) => { if (route.request().method() === "PATCH") updatePayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: record }); });
  await page.goto("/loan/new");
  await page.getByLabel("Loan amount").fill("500"); await page.getByLabel("Repayment date").fill("2026-08-14"); await page.getByRole("button", { name: "Create given loan" }).click();
  await expect(page).toHaveURL(`/loan/${ids.record}`);
  expect(createPayload).toMatchObject({ account_id: ids.account, direction: "given", person_id: ids.person, principal_amount: "500" });
  await page.getByRole("link", { name: "Edit loan" }).click();
  await page.getByLabel("Loan amount").fill("600"); await page.getByRole("button", { name: "Save loan" }).click();
  expect(updatePayload).toMatchObject({ principal_amount: "600" });
});

test("imports, creates, edits, and Drawer-deletes loan contacts", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "contacts", { configurable: true, value: { select: async () => [{ name: ["Jamie Doe"], tel: ["+12025550155"] }] } }));
  const payloads: Record<string, unknown>[] = []; let deleted = false;
  await page.route("**/api/backend/loans/people", async (route) => { payloads.push(route.request().postDataJSON() as Record<string, unknown>); await route.fulfill({ contentType: "application/json", json: person, status: 201 }); });
  await page.route(`**/api/backend/loans/people/${ids.person}`, async (route) => { if (route.request().method() === "PATCH") payloads.push(route.request().postDataJSON() as Record<string, unknown>); if (route.request().method() === "DELETE") deleted = true; await route.fulfill({ contentType: "application/json", json: person }); });
  await page.goto("/loan/people/new"); await page.getByRole("button", { name: "Select from contacts" }).click();
  await expect(page.getByLabel("Person name")).toHaveValue("Jamie Doe"); await page.getByRole("button", { name: "Add contact" }).click();
  expect(payloads[0]).toMatchObject({ name: "Jamie Doe", phone_number: "+12025550155" });
  await page.getByRole("link", { name: /Alex Morgan/ }).click(); await page.getByLabel("Person note").fill("Updated note"); await page.getByRole("button", { name: "Save contact" }).click();
  expect(payloads[1]).toMatchObject({ note: "Updated note" });
  await page.getByRole("button", { name: "Delete Alex Morgan" }).click(); await expect(page.getByRole("dialog", { name: "Delete Alex Morgan?" })).toBeVisible(); await page.getByRole("button", { name: "Delete contact" }).click();
  expect(deleted).toBe(true);
});

test("records settlements and Drawer-deletes loan records", async ({ page }) => {
  let settlementPayload: Record<string, unknown> | null = null; let deleted = false;
  await page.route(`**/api/backend/loans/records/${ids.record}/settlements`, async (route) => { settlementPayload = route.request().postDataJSON() as Record<string, unknown>; await route.fulfill({ contentType: "application/json", json: settlement, status: 201 }); });
  await page.route(`**/api/backend/loans/records/${ids.record}`, async (route) => { if (route.request().method() === "DELETE") deleted = true; await route.fulfill({ contentType: "application/json", json: record }); });
  await page.goto(`/loan/${ids.record}`); await page.getByRole("button", { name: "Record settlement" }).click(); await page.getByLabel("Settlement amount").fill("50"); await page.getByRole("button", { name: "Record settlement" }).last().click();
  expect(settlementPayload).toMatchObject({ account_id: ids.account, amount: "50" });
  await page.getByRole("button", { name: "Delete loan" }).click(); await expect(page.getByRole("dialog", { name: "Delete this loan?" })).toBeVisible(); await page.getByRole("button", { name: "Delete loan" }).last().click(); await expect(page).toHaveURL("/loan"); expect(deleted).toBe(true);
});

test("handles empty accessible loan views without horizontal overflow", async ({ page }) => {
  await page.route("**/api/backend/loans/records?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));
  await page.goto("/loan"); await expect(page.getByText("No loan records")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for loans`, async ({ page }) => {
    await page.goto("/loan"); await page.evaluate((selectedTheme) => localStorage.setItem("pfm-mobile-theme", selectedTheme), theme); await page.reload(); await expect(page.getByText("Alex Morgan")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`loans-${theme}.png`, { animations: "disabled", fullPage: true });
  });
}
