import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const accountOne = {
  archived_at: null,
  created_at: "2026-07-01T00:00:00Z",
  currency: "USD",
  current_balance: "1000.0000",
  disabled_at: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_archived: false,
  is_default: true,
  is_disabled: false,
  name: "Everyday account",
  opening_balance: "0.0000",
  type: "bank_account",
  updated_at: "2026-07-01T00:00:00Z",
};
const accountTwo = { ...accountOne, currency: "EUR", id: "22222222-2222-2222-2222-222222222222", is_default: false, name: "Travel account" };
const category = {
  archived_at: null,
  created_at: "2026-07-01T00:00:00Z",
  icon_key: "coffee",
  id: "33333333-3333-3333-3333-333333333333",
  is_archived: false,
  is_default: true,
  kind: "expense",
  name: "Dining",
  updated_at: "2026-07-01T00:00:00Z",
};
const transactionId = "44444444-4444-4444-4444-444444444444";
const transaction = {
  account_id: accountOne.id,
  amount: "45.2500",
  category_id: category.id,
  created_at: "2026-07-15T12:00:00Z",
  currency: "USD",
  description: "Lunch",
  id: transactionId,
  transaction_at: "2026-07-15T12:00:00Z",
  type: "expense",
  updated_at: "2026-07-15T12:00:00Z",
  voided_at: null,
};
const existingReceipt = {
  checksum_sha256: "abc",
  content_type: "application/pdf",
  created_at: "2026-07-15T12:00:00Z",
  id: "55555555-5555-5555-5555-555555555555",
  original_filename: "lunch.pdf",
  size_bytes: 2048,
  transaction_id: transactionId,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/backend/accounts**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [accountOne, accountTwo], next_cursor: null } }));
  await page.route("**/api/backend/categories**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [category], next_cursor: null } }));
});

test("creates an expense with an attached receipt", async ({ page }) => {
  let createdPayload: Record<string, unknown> | null = null;
  let receiptUploaded = false;
  await page.route("**/api/backend/transactions", async (route) => {
    createdPayload = route.request().postDataJSON() as Record<string, unknown>;
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    await route.fulfill({ contentType: "application/json", json: transaction, status: 201 });
  });
  await page.route("**/api/backend/receipts?**", async (route) => {
    receiptUploaded = route.request().method() === "POST";
    expect(route.request().headers()["x-receipt-filename"]).toBe("lunch.pdf");
    await route.fulfill({ contentType: "application/json", json: existingReceipt, status: 201 });
  });

  await page.goto("/transactions/new?type=expense");
  await page.getByLabel("Amount").fill("45.25");
  await page.getByLabel("Note").fill("Lunch");
  await page.getByLabel("Receipt file").setInputFiles({ buffer: Buffer.from("receipt"), mimeType: "application/pdf", name: "lunch.pdf" });
  await page.getByRole("button", { name: "Save expense" }).click();

  await expect(page).toHaveURL(/\/$/);
  expect(createdPayload).toMatchObject({ account_id: accountOne.id, amount: "45.25", category_id: category.id, type: "expense" });
  expect(receiptUploaded).toBe(true);
});

test("creates a cross-currency transfer with the received amount", async ({ page }) => {
  let transferPayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/transactions/transfers", async (route) => {
    transferPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ contentType: "application/json", json: {
      amount: "100.0000",
      converted_amount: "92.5000",
      converted_currency: "EUR",
      created_at: "2026-07-15T12:00:00Z",
      credit_transaction_id: "66666666-6666-6666-6666-666666666666",
      debit_transaction_id: transactionId,
      description: "Travel funds",
      from_account_id: accountOne.id,
      id: "77777777-7777-7777-7777-777777777777",
      to_account_id: accountTwo.id,
      transaction_at: "2026-07-15T12:00:00Z",
    }, status: 201 });
  });

  await page.goto("/transactions/new?type=transfer");
  await page.getByLabel("Amount", { exact: true }).fill("100");
  await page.getByLabel("Amount received in EUR").fill("92.50");
  await page.getByRole("button", { name: "Transfer money" }).click();

  await expect(page).toHaveURL(/\/$/);
  expect(transferPayload).toMatchObject({ amount: "100", converted_amount: "92.50", from_account_id: accountOne.id, to_account_id: accountTwo.id });
});

test("edits a transaction and manages its receipts", async ({ page }) => {
  let receiptItems = [existingReceipt];
  let updatedPayload: Record<string, unknown> | null = null;
  await page.route(`**/api/backend/transactions/${transactionId}`, async (route) => {
    if (route.request().method() === "PATCH") {
      updatedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ contentType: "application/json", json: { ...transaction, ...updatedPayload } });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: transaction });
  });
  await page.route("**/api/backend/receipts?**", async (route) => {
    if (route.request().method() === "POST") {
      receiptItems = [{ ...existingReceipt, id: "88888888-8888-8888-8888-888888888888", original_filename: "new.png" }];
      await route.fulfill({ contentType: "application/json", json: receiptItems[0], status: 201 });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: { has_more: false, items: receiptItems, next_cursor: null } });
  });
  await page.route(`**/api/backend/receipts/${existingReceipt.id}`, async (route) => {
    receiptItems = [];
    await route.fulfill({ contentType: "application/json", json: existingReceipt });
  });
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto(`/transactions/${transactionId}/edit`);
  await expect(page.getByText("lunch.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Remove lunch.pdf" }).click();
  await expect(page.getByText("No receipts attached yet.")).toBeVisible();
  await page.getByLabel("Add receipt file").setInputFiles({ buffer: Buffer.from("image"), mimeType: "image/png", name: "new.png" });
  await expect(page.getByText("new.png")).toBeVisible();
  await page.getByLabel("Amount").fill("48.75");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/$/);
  expect(updatedPayload).toMatchObject({ amount: "48.75", category_id: category.id });
});

test("transaction forms are mobile-safe and accessible", async ({ page }) => {
  await page.route(`**/api/backend/transactions/${transactionId}`, async (route) => route.fulfill({ contentType: "application/json", json: transaction }));
  await page.route("**/api/backend/receipts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));

  for (const route of ["/transactions/new", `/transactions/${transactionId}/edit`]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: route.includes("edit") ? "Edit transaction" : "Add transaction" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
