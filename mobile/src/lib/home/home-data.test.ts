import { afterEach, describe, expect, it, vi } from "vitest";

import { getHomeData } from "@/lib/home/api";
import { formatMoney, formatSignedMoney, mapTransaction } from "@/lib/home/view-model";

const dashboard = {
  available_balance: "87457.8500",
  buckets: [],
  currency: "USD",
  expense_amount: "8145.7800",
  income_amount: "4875.1200",
  net_flow_amount: "-3270.6600",
  period: "month",
  range: { end_at: "2025-12-01T00:00:00Z", start_at: "2025-11-01T00:00:00Z", timezone: "UTC" },
  type: "expense",
} as const;

const transactions = {
  has_more: false,
  items: [{
    account_id: "11111111-1111-1111-1111-111111111111",
    amount: "354.2500",
    category_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2025-11-12T10:00:00Z",
    currency: "USD",
    description: "Coffee with friends",
    id: "33333333-3333-3333-3333-333333333333",
    transaction_at: "2025-11-12T10:00:00Z",
    type: "expense",
    updated_at: "2025-11-12T10:00:00Z",
    voided_at: null,
  }],
  next_cursor: null,
} as const;

afterEach(() => vi.unstubAllGlobals());

describe("home data", () => {
  it("loads the dashboard before requesting month-scoped recent activity", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(dashboard), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(transactions), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHomeData()).resolves.toEqual({ dashboard, transactions });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/backend/reports/dashboard?period=month&type=expense", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/backend/transactions?"), expect.any(Object));
    expect(fetchMock.mock.calls[1]?.[0]).toContain("date_from=2025-11-01T00%3A00%3A00Z");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("limit=10");
  });

  it("formats decimal-string money without floating-point conversion", () => {
    expect(formatMoney("90071992547409.995", "USD")).toBe("$90,071,992,547,410.00");
    expect(formatSignedMoney("-0.004", "USD")).toBe("−$0.00");
  });

  it("maps transaction direction and schema-safe labels", () => {
    expect(mapTransaction(transactions.items[0])).toMatchObject({
      accent: "coral",
      amount: "−$354.25",
      isNegative: true,
      name: "Coffee with friends",
      subtitle: "Expense",
    });
  });
});
