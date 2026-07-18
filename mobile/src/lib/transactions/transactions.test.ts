import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransaction, listTransactions, uploadReceipt, validateReceipt } from "@/lib/transactions/api";
import { groupTransactions, isIncomingTransaction, transactionDateRange, transactionTitle } from "@/lib/transactions/history";
import { exceedsAccountBalance, transactionFormSchema, validateConvertedAmount } from "@/lib/transactions/schemas";

afterEach(() => vi.unstubAllGlobals());

const validValues = {
  accountId: "11111111-1111-1111-1111-111111111111",
  amount: "12.3400",
  categoryId: "22222222-2222-2222-2222-222222222222",
  convertedAmount: "",
  description: "Lunch",
  kind: "expense" as const,
  toAccountId: "",
  transactionAt: "2026-07-15T12:00",
};

describe("transaction flows", () => {
  it("enforces backend-compatible money and reference validation", () => {
    expect(transactionFormSchema.safeParse(validValues).success).toBe(true);
    expect(transactionFormSchema.safeParse({ ...validValues, amount: "0" }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...validValues, categoryId: "" }).success).toBe(false);
    expect(transactionFormSchema.safeParse({
      ...validValues,
      categoryId: "",
      kind: "transfer",
      toAccountId: validValues.accountId,
    }).success).toBe(false);
    expect(validateConvertedAmount("145.2500")).toBeNull();
    expect(validateConvertedAmount("0")).toMatch(/positive amount/);
    expect(exceedsAccountBalance("100.0001", "100.0000")).toBe(true);
    expect(exceedsAccountBalance("100.0000", "100.0000")).toBe(false);
    expect(exceedsAccountBalance("not-a-number", "100.0000")).toBe(false);
  });

  it("validates receipt type and size before upload", () => {
    expect(validateReceipt(new File(["receipt"], "receipt.pdf", { type: "application/pdf" }))).toBeNull();
    expect(validateReceipt(new File(["bad"], "receipt.txt", { type: "text/plain" }))).toMatch(/PDF/);
  });

  it("sends idempotency and receipt metadata through the secure same-origin API", async () => {
    const transaction = {
      account_id: validValues.accountId,
      amount: "12.3400",
      category_id: validValues.categoryId,
      created_at: "2026-07-15T12:00:00Z",
      currency: "USD",
      description: "Lunch",
      id: "33333333-3333-3333-3333-333333333333",
      transaction_at: "2026-07-15T12:00:00Z",
      type: "expense",
      updated_at: "2026-07-15T12:00:00Z",
      voided_at: null,
    };
    const receipt = {
      checksum_sha256: "abc",
      content_type: "application/pdf",
      created_at: "2026-07-15T12:00:00Z",
      id: "44444444-4444-4444-4444-444444444444",
      original_filename: "receipt.pdf",
      size_bytes: 7,
      transaction_id: transaction.id,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(transaction), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(receipt), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await createTransaction({
      account_id: validValues.accountId,
      amount: validValues.amount,
      category_id: validValues.categoryId,
      description: validValues.description,
      transaction_at: "2026-07-15T12:00:00Z",
      type: "expense",
    }, "idem-123");
    await uploadReceipt(transaction.id, new File(["receipt"], "receipt.pdf", { type: "application/pdf" }));

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: "same-origin",
      headers: expect.objectContaining({ "idempotency-key": "idem-123" }),
      method: "POST",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "content-type": "application/pdf", "x-receipt-filename": "receipt.pdf" }),
      method: "POST",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("access_token");
  });

  it("requests cursor-paginated transfer activity through the unified filter", async () => {
    const debit = { ...transactionsFixture, id: "44444444-4444-4444-4444-444444444444", type: "transfer_debit" };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ has_more: true, items: [debit], next_cursor: "older-page" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listTransactions({ cursor: "older-page", dateFrom: "2026-07-01T00:00:00Z", dateTo: "2026-08-01T00:00:00Z", search: "travel", type: "transfer" })).resolves.toEqual({ has_more: true, items: [debit], next_cursor: "older-page" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("type=transfer");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("cursor=older-page");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("limit=20");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("search=travel");
  });

  it("groups activity and maps transaction meaning for mobile history", () => {
    const income = { ...transactionsFixture, type: "income" };
    expect(isIncomingTransaction(income)).toBe(true);
    expect(transactionTitle(income, [])).toBe("Lunch");
    expect(groupTransactions([income])).toHaveLength(1);
    const selectedRange = transactionDateRange("month", "2026-07-15");
    expect(new Date(selectedRange.dateTo).getTime() - new Date(selectedRange.dateFrom).getTime()).toBe(86_400_000);
  });
});

const transactionsFixture = {
  account_id: validValues.accountId,
  amount: "12.3400",
  category_id: validValues.categoryId,
  created_at: "2026-07-15T12:00:00Z",
  currency: "USD",
  description: "Lunch",
  id: "33333333-3333-3333-3333-333333333333",
  transaction_at: "2026-07-15T12:00:00Z",
  type: "expense",
  updated_at: "2026-07-15T12:00:00Z",
  voided_at: null,
};
