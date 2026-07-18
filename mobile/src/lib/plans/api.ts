import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import { planMonthRange } from "@/lib/plans/utils";
import type { AccountList, Budget, BudgetCreate, BudgetData, BudgetList, BudgetUpdate, CategoryList, GoalData, GoalStatus, PlanData, SavingsContributionCreate, SavingsGoal, SavingsGoalCreate, SavingsGoalList, SavingsGoalUpdate, SavingsTransfer, SavingsTransferCreate } from "@/lib/plans/types";

function activeAccounts(accounts: AccountList) {
  return accounts.items.filter((account) => !account.is_archived && !account.is_disabled);
}

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
  return sendBackendJson<Budget>("budgets", "POST", { ...payload, period_end: range.end, period_start: range.start });
}

export function createSavingsGoal(payload: SavingsGoalCreate) {
  return sendBackendJson<SavingsGoal>("savings-goals", "POST", payload);
}

export function createContribution(goalId: string, payload: SavingsContributionCreate) {
  return sendBackendJson(`savings-goals/${encodeURIComponent(goalId)}/contributions`, "POST", payload);
}

export async function getBudgetData(month: string): Promise<BudgetData> {
  const [budgets, categories, accounts] = await Promise.all([
    getBackendJson<BudgetList>(`budgets?month=${month}&limit=100`, "We couldn't load this month’s budgets."),
    getBackendJson<CategoryList>("categories?kind=expense&limit=100", "We couldn't load budget categories."),
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
  ]);
  return {
    accounts: activeAccounts(accounts),
    budgets: budgets.items.filter((budget) => !budget.is_archived),
    categories: categories.items.filter((category) => !category.is_archived),
  };
}

export function updateBudget(id: string, payload: BudgetUpdate) {
  return sendBackendJson<Budget>(`budgets/${encodeURIComponent(id)}`, "PATCH", payload);
}

export function deleteBudget(id: string) {
  return sendBackendJson<Budget>(`budgets/${encodeURIComponent(id)}`, "DELETE");
}

export async function getGoalData(status: GoalStatus): Promise<GoalData> {
  const [goals, accounts] = await Promise.all([
    getBackendJson<SavingsGoalList>(`savings-goals?status=${status}&limit=100`, "We couldn't load your savings goals."),
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
  ]);
  return {
    accounts: activeAccounts(accounts),
    goals: goals.items.filter((goal) => goal.status !== "archived"),
  };
}

export function getSavingsGoal(id: string) {
  return getBackendJson<SavingsGoal>(`savings-goals/${encodeURIComponent(id)}`, "We couldn't load this savings goal.");
}

export async function getGoalEditorData(id?: string) {
  const accounts = await getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts.");
  const goal = id ? await getSavingsGoal(id) : null;
  return { accounts: activeAccounts(accounts), goal };
}

export function updateSavingsGoal(id: string, payload: SavingsGoalUpdate) {
  return sendBackendJson<SavingsGoal>(`savings-goals/${encodeURIComponent(id)}`, "PATCH", payload);
}

export function deleteSavingsGoal(id: string) {
  return sendBackendJson<SavingsGoal>(`savings-goals/${encodeURIComponent(id)}`, "DELETE");
}

export function createSavingsTransfer(payload: SavingsTransferCreate, idempotencyKey: string) {
  return sendBackendJson<SavingsTransfer>("transactions/savings-transfers", "POST", payload, { "idempotency-key": idempotencyKey });
}
