import Decimal from "decimal.js";
import type { Budget, SavingsGoal } from "@/lib/plans/types";

export function planMonthRange(month: string): { end: string; start: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month");
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year!, monthNumber! - 1, 1));
  const end = new Date(Date.UTC(year!, monthNumber!, 1));
  return { end: end.toISOString().slice(0, 10), start: start.toISOString().slice(0, 10) };
}

export function progressPercent(value: string): number {
  try { return Math.max(0, Math.min(100, new Decimal(value).toNumber())); } catch { return 0; }
}

export function isPositiveMoney(value: string): boolean {
  return /^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/.test(value.trim());
}

export function isMoney(value: string): boolean {
  return /^\d{1,14}(?:\.\d{1,4})?$/.test(value.trim());
}

export function budgetTotals(budgets: Budget[]) {
  const overall = budgets.find((budget) => budget.category_id === null);
  const source = overall ? [overall] : budgets;
  return source.reduce((totals, budget) => ({
    limit: totals.limit + Number(budget.limit_amount),
    remaining: totals.remaining + Number(budget.progress.remaining_amount),
    spent: totals.spent + Number(budget.progress.spent_amount),
  }), { limit: 0, remaining: 0, spent: 0 });
}

export function goalTotals(goals: SavingsGoal[]) {
  const totals = goals.reduce((value, goal) => ({
    active: value.active + (goal.status === "active" ? 1 : 0),
    saved: value.saved + Number(goal.progress.saved_amount),
    target: value.target + Number(goal.target_amount),
  }), { active: 0, saved: 0, target: 0 });
  return { ...totals, percent: totals.target > 0 ? Math.min(100, (totals.saved / totals.target) * 100) : 0 };
}

export function preferredGoalAccount<T extends { currency: string; id: string; is_default: boolean }>(accounts: T[], currency: string): T | null {
  const matching = accounts.filter((account) => account.currency === currency);
  return matching.find((account) => account.is_default) ?? matching[0] ?? null;
}
