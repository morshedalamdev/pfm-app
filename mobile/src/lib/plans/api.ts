import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import { planMonthRange } from "@/lib/plans/utils";
import type { BudgetCreate, BudgetList, CategoryList, PlanData, SavingsContributionCreate, SavingsGoalCreate, SavingsGoalList } from "@/lib/plans/types";

export async function getPlanData(month: string): Promise<PlanData> {
  const [budgets, goals, categories] = await Promise.all([
    getBackendJson<BudgetList>(`budgets?month=${month}&limit=100`, "We couldn't load this month’s budgets."),
    getBackendJson<SavingsGoalList>("savings-goals?status=active&limit=100", "We couldn't load your savings goals."),
    getBackendJson<CategoryList>("categories?kind=expense&limit=100", "We couldn't load budget categories."),
  ]);
  return {
    budgets: budgets.items.filter((budget) => !budget.is_archived),
    categories: categories.items.filter((category) => !category.is_archived),
    goals: goals.items.filter((goal) => goal.status === "active"),
  };
}

export function createBudget(month: string, payload: Omit<BudgetCreate, "period_end" | "period_start">) {
  const range = planMonthRange(month);
  return sendBackendJson("budgets", "POST", { ...payload, period_end: range.end, period_start: range.start });
}

export function createSavingsGoal(payload: SavingsGoalCreate) {
  return sendBackendJson("savings-goals", "POST", payload);
}

export function createContribution(goalId: string, payload: SavingsContributionCreate) {
  return sendBackendJson(`savings-goals/${encodeURIComponent(goalId)}/contributions`, "POST", payload);
}
