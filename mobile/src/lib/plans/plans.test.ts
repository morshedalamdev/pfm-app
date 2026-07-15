import { afterEach, describe, expect, it, vi } from "vitest";

import { createSavingsTransfer, getPlanData } from "@/lib/plans/api";
import type { Budget, SavingsGoal } from "@/lib/plans/types";
import { budgetTotals, goalTotals, isPositiveMoney, planMonthRange, preferredGoalAccount, progressPercent } from "@/lib/plans/utils";

const budget = (categoryId: string | null, limit: string, spent: string): Budget => ({ archived_at: null, category_id: categoryId, category_name: categoryId ? "Dining" : null, created_at: "2026-07-01T00:00:00Z", currency: "USD", id: categoryId ?? "overall", is_archived: false, limit_amount: limit, period_end: "2026-08-01", period_start: "2026-07-01", period_type: "monthly", progress: { percent_used: "25", remaining_amount: String(Number(limit) - Number(spent)), spent_amount: spent, status: "on_track" }, updated_at: "2026-07-01T00:00:00Z" });
const goal = (status: SavingsGoal["status"], saved: string, target: string): SavingsGoal => ({ archived_at: null, completed_at: status === "completed" ? "2026-07-01T00:00:00Z" : null, created_at: "2026-07-01T00:00:00Z", currency: "USD", id: `${status}-${saved}`, monthly_target_amount: "100", name: "Goal", note: null, progress: { is_target_met: status === "completed", percent_complete: String((Number(saved) / Number(target)) * 100), remaining_amount: String(Number(target) - Number(saved)), saved_amount: saved }, status, target_amount: target, target_date: null, updated_at: "2026-07-01T00:00:00Z" });

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

  it("uses the overall budget for totals without double counting allocations", () => {
    expect(budgetTotals([budget(null, "1000", "250"), budget("food", "400", "100")])).toEqual({ limit: 1000, remaining: 750, spent: 250 });
  });

  it("summarizes goals and chooses a same-currency default contribution account", () => {
    expect(goalTotals([goal("active", "250", "1000"), goal("completed", "500", "500")])).toEqual({ active: 1, percent: 50, saved: 750, target: 1500 });
    expect(preferredGoalAccount([{ currency: "EUR", id: "eur", is_default: true }, { currency: "USD", id: "usd", is_default: false }], "USD")?.id).toBe("usd");
  });

  it("creates account-backed savings transfers with idempotency", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "transfer" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await createSavingsTransfer({ amount: "125", description: "Monthly saving", from_account_id: "account", savings_goal_id: "goal", transaction_at: "2026-07-16T00:00:00Z" }, "saving-key");
    expect(fetchMock).toHaveBeenCalledWith("/api/backend/transactions/savings-transfers", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "saving-key" }), method: "POST" }));
  });
});
