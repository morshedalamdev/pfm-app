import type { components } from "@generated/api-types";

export type Budget = components["schemas"]["BudgetResponse"];
export type BudgetList = components["schemas"]["BudgetListResponse"];
export type BudgetCreate = components["schemas"]["BudgetCreateRequest"];
export type BudgetUpdate = components["schemas"]["BudgetUpdateRequest"];
export type CategoryList = components["schemas"]["CategoryListResponse"];
export type Account = components["schemas"]["AccountResponse"];
export type AccountList = components["schemas"]["AccountListResponse"];
export type SavingsGoal = components["schemas"]["SavingsGoalResponse"];
export type SavingsGoalList = components["schemas"]["SavingsGoalListResponse"];
export type SavingsGoalCreate = components["schemas"]["SavingsGoalCreateRequest"];
export type SavingsGoalUpdate = components["schemas"]["SavingsGoalUpdateRequest"];
export type SavingsContributionCreate = components["schemas"]["SavingsContributionCreateRequest"];
export type SavingsTransferCreate = components["schemas"]["SavingsTransferCreateRequest"];
export type SavingsTransfer = components["schemas"]["SavingsTransferResponse"];

export type GoalStatus = "active" | "completed" | "all";

export type BudgetData = Readonly<{
  accounts: Account[];
  budgets: Budget[];
  categories: CategoryList["items"];
}>;

export type GoalData = Readonly<{
  accounts: Account[];
  goals: SavingsGoal[];
}>;

export type PlanData = Readonly<{
  budgets: Budget[];
  categories: CategoryList["items"];
  goals: SavingsGoal[];
}>;
