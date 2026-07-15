import { afterEach, describe, expect, it, vi } from "vitest";

import { getReportData } from "@/lib/reports/api";
import { cashFlowHeight, formatReportPercent, monthRange } from "@/lib/reports/utils";

afterEach(() => vi.unstubAllGlobals());

const range = { end_at: "2025-12-01T00:00:00Z", start_at: "2025-11-01T00:00:00Z", timezone: "UTC" } as const;
const summary = {
  active_savings_goal_count: 2,
  budget_used_percent: "45.5",
  currency: "USD",
  expense_amount: "8145.7800",
  income_amount: "12000.0000",
  month: "2025-11",
  net_flow_amount: "3854.2200",
  range,
  savings_amount: "2800.0000",
  savings_month_over_month_percent: "12.5000",
  top_expenses: [],
  trends: { average_daily_spending: "271.5260", budget_adherence_percent: "45.5000", most_expensive_day: null },
} as const;
const cashFlow = { buckets: [], currency: "USD", interval: "day", range } as const;
const spending = { currency: "USD", items: [], range, total_amount: "8145.7800" } as const;

describe("reports", () => {
  it("uses one exact UTC month range for cash flow and category requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(summary), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(cashFlow), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(spending), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getReportData("2025-11")).resolves.toEqual({ cashFlow, spending, summary });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/backend/reports/monthly-summary?month=2025-11");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("date_from=2025-11-01T00%3A00%3A00.000Z");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("date_to=2025-12-01T00%3A00%3A00.000Z");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("reports/spending-by-category?");
  });

  it("keeps month boundaries and chart ratios predictable", () => {
    expect(monthRange("2026-02")).toEqual({ endAt: "2026-03-01T00:00:00.000Z", startAt: "2026-02-01T00:00:00.000Z" });
    expect(cashFlowHeight("25", "100")).toBe(25);
    expect(cashFlowHeight("0", "0")).toBe(0);
    expect(formatReportPercent("-12.5")).toBe("−12.5%");
  });
});
