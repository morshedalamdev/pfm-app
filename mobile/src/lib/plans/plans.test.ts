import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlanData } from "@/lib/plans/api";
import { isPositiveMoney, planMonthRange, progressPercent } from "@/lib/plans/utils";

afterEach(() => vi.unstubAllGlobals());

describe("plans", () => {
  it("loads budgets, active goals, and budget categories together", async () => {
    const budgets = { has_more: false, items: [], next_cursor: null };
    const goals = { has_more: false, items: [], next_cursor: null };
    const categories = { has_more: false, items: [], next_cursor: null };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(budgets), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(goals), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(categories), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPlanData("2025-11")).resolves.toEqual({ budgets: [], categories: [], goals: [] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/backend/budgets?month=2025-11&limit=100");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/backend/savings-goals?status=active&limit=100");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/backend/categories?kind=expense&limit=100");
  });

  it("keeps plan money and period boundaries valid", () => {
    expect(planMonthRange("2026-02")).toEqual({ end: "2026-03-01", start: "2026-02-01" });
    expect(isPositiveMoney("0.0001")).toBe(true);
    expect(isPositiveMoney("0")).toBe(false);
    expect(progressPercent("151")).toBe(100);
  });
});
