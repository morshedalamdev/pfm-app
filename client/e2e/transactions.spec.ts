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
  await page.route("**/api/backend/transactions?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [transaction], next_cursor: null } }));
  await page.route("**/api/backend/receipts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [existingReceipt], next_cursor: null } }));
});

test("searches and filters the complete transaction history", async ({ page }) => {
  await page.goto("/transaction");
  await expect(page.getByRole("link", { name: /Lunch/ })).toBeVisible();
  await expect(page.getByLabel("Quick transaction actions")).toHaveCount(0);

  const searchRequest = page.waitForRequest((request) => request.url().includes("/api/backend/transactions?") && request.url().includes("search=rent"));
  await page.getByLabel("Search transactions").fill("rent");
  await searchRequest;

  await page.getByRole("button", { name: "Filter transactions" }).click();
  const drawer = page.getByRole("dialog", { name: "Filter transactions" });
  const transferRequest = page.waitForRequest((request) => request.url().includes("type=transfer"));
  await drawer.getByRole("button", { name: "transfer" }).click();
  await transferRequest;
  await drawer.getByRole("button", { name: "Show transactions" }).click();
  await expect(drawer).toBeHidden();
});

test("loads additional transaction pages as the user scrolls", async ({ page }) => {
  const firstPage = Array.from({ length: 20 }, (_, index) => ({
    ...transaction,
    description: `Page one transaction ${index + 1}`,
    id: `60000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    transaction_at: `2026-07-${String(28 - index).padStart(2, "0")}T12:00:00Z`,
  }));
  const secondPage = [
    { ...transaction, description: "Older page transaction 1", id: "70000000-0000-0000-0000-000000000001", transaction_at: "2026-06-30T12:00:00Z" },
    { ...transaction, description: "Older page transaction 2", id: "70000000-0000-0000-0000-000000000002", transaction_at: "2026-06-29T12:00:00Z" },
  ];
  let nextPageRequested = false;
  await page.route("**/api/backend/transactions?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.get("cursor") === "cursor-page-two") {
      nextPageRequested = true;
      await route.fulfill({ contentType: "application/json", json: { has_more: false, items: secondPage, next_cursor: null } });
      return;
    }
    expect(requestUrl.searchParams.get("limit")).toBe("20");
    await route.fulfill({ contentType: "application/json", json: { has_more: true, items: firstPage, next_cursor: "cursor-page-two" } });
  });

  await page.goto("/transaction");
  await expect(page.getByText("Page one transaction 1", { exact: true })).toBeVisible();
  const nextPageRequest = page.waitForRequest((request) => request.url().includes("cursor=cursor-page-two"));
  await page.getByTestId("transaction-load-more-sentinel").scrollIntoViewIfNeeded();
  await nextPageRequest;
  await expect(page.getByText("Older page transaction 1")).toBeVisible();
  expect(nextPageRequested).toBe(true);
  await expect(page.getByText("All transactions loaded")).toBeVisible();
});

test("opens transaction details and deletes through a Drawer", async ({ page }) => {
  let deleted = false;
  await page.route(`**/api/backend/transactions/${transactionId}`, async (route) => {
    if (route.request().method() === "DELETE") deleted = true;
    await route.fulfill({ contentType: "application/json", json: { ...transaction, voided_at: deleted ? "2026-07-15T13:00:00Z" : null } });
  });
  await page.goto("/transaction");
  await page.getByRole("link", { name: /Lunch/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transaction/${transactionId}$`));
  await expect(page.getByRole("heading", { name: "Transaction details" })).toBeVisible();
  await page.getByRole("button", { name: "Delete transaction" }).click();
  const drawer = page.getByRole("dialog", { name: "Delete this transaction?" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Delete transaction" }).click();
  await expect(page).toHaveURL(/\/transaction$/);
  expect(deleted).toBe(true);
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

  await page.goto("/transaction/new?type=expense");
  await page.getByLabel("Amount").fill("45.25");
  await page.getByLabel("Note").fill("Lunch");
  await page.getByLabel("Receipt file").setInputFiles({ buffer: Buffer.from("receipt"), mimeType: "application/pdf", name: "lunch.pdf" });
  await page.getByRole("button", { name: "Save expense" }).click();

  await expect(page).toHaveURL(/\/transaction$/);
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

  await page.goto("/transaction/new?type=transfer");
  await page.getByLabel("Amount", { exact: true }).fill("100");
  await page.getByLabel("Amount received in EUR").fill("92.50");
  await page.getByRole("button", { name: "Transfer money" }).click();

  await expect(page).toHaveURL(/\/transaction$/);
  expect(transferPayload).toMatchObject({ amount: "100", converted_amount: "92.50", from_account_id: accountOne.id, to_account_id: accountTwo.id });
});

test("prevents expenses and transfers that exceed the source account balance", async ({ page }) => {
  let expenseCreated = false;
  let transferCreated = false;
  await page.route("**/api/backend/transactions", async (route) => {
    expenseCreated = true;
    await route.fulfill({ contentType: "application/json", json: transaction, status: 201 });
  });
  await page.route("**/api/backend/transactions/transfers", async (route) => {
    transferCreated = true;
    await route.fulfill({ contentType: "application/json", json: {}, status: 201 });
  });

  await page.goto("/transaction/new?type=expense");
  await page.getByLabel("Amount").fill("1000.0001");
  await expect(page.getByRole("alert").filter({ hasText: "Insufficient balance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save expense" })).toBeDisabled();
  expect(expenseCreated).toBe(false);

  await page.goto("/transaction/new?type=transfer");
  await page.getByLabel("Amount", { exact: true }).fill("1000.0001");
  await expect(page.getByRole("alert").filter({ hasText: "Insufficient balance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Transfer money" })).toBeDisabled();
  expect(transferCreated).toBe(false);
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
  await page.goto(`/transaction/${transactionId}/edit`);
  await expect(page.getByText("lunch.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Remove lunch.pdf" }).click();
  const receiptDrawer = page.getByRole("dialog", { name: "Remove this receipt?" });
  await expect(receiptDrawer).toBeVisible();
  await receiptDrawer.getByRole("button", { name: "Remove receipt" }).click();
  await expect(page.getByText("No receipts attached yet.")).toBeVisible();
  await page.getByLabel("Add receipt file").setInputFiles({ buffer: Buffer.from("image"), mimeType: "image/png", name: "new.png" });
  await expect(page.getByText("new.png")).toBeVisible();
  await page.getByLabel("Amount").fill("48.75");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/transaction$/);
  expect(updatedPayload).toMatchObject({ amount: "48.75", category_id: category.id });
});

test("transaction forms are mobile-safe and accessible", async ({ page }) => {
  await page.route(`**/api/backend/transactions/${transactionId}`, async (route) => route.fulfill({ contentType: "application/json", json: transaction }));
  await page.route("**/api/backend/receipts?**", async (route) => route.fulfill({ contentType: "application/json", json: { has_more: false, items: [], next_cursor: null } }));

  for (const route of ["/transaction", "/transaction/new", `/transaction/${transactionId}`, `/transaction/${transactionId}/edit`]) {
    await page.goto(route);
    const title = route.endsWith("/transaction") ? "Transactions" : route.endsWith(transactionId) ? "Transaction details" : route.includes("edit") ? "Edit transaction" : "Add transaction";
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`matches the ${theme} theme reference baseline for transaction history`, async ({ page }) => {
    await page.goto("/transaction");
    await page.evaluate((selectedTheme) => localStorage.setItem("pfm-mobile-theme", selectedTheme), theme);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("link", { name: /Lunch/ })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveScreenshot(`transaction-history-${theme}.png`, { animations: "disabled", fullPage: true });
  });
}
