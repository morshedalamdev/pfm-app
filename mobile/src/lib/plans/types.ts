import type { components } from "@generated/api-types";

export type Budget = components["schemas"]["BudgetResponse"];
export type BudgetList = components["schemas"]["BudgetListResponse"];
export type BudgetCreate = components["schemas"]["BudgetCreateRequest"];
export type CategoryList = components["schemas"]["CategoryListResponse"];
export type SavingsGoal = components["schemas"]["SavingsGoalResponse"];
export type SavingsGoalList = components["schemas"]["SavingsGoalListResponse"];
export type SavingsGoalCreate = components["schemas"]["SavingsGoalCreateRequest"];
export type SavingsContributionCreate = components["schemas"]["SavingsContributionCreateRequest"];

export type PlanData = Readonly<{
  budgets: Budget[];
  categories: CategoryList["items"];
  goals: SavingsGoal[];
}>;
