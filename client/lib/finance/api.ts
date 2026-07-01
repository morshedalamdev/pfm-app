import type { components } from "@/generated/api-types";
import {
  apiDelete,
  apiGet,
  apiPatch,
  type ApiPath,
  apiPost,
} from "@/lib/api/client";

export type Account = components["schemas"]["AccountResponse"];
export type Budget = components["schemas"]["BudgetResponse"];
export type BudgetCreate = components["schemas"]["BudgetCreateRequest"];
export type Category = components["schemas"]["CategoryResponse"];
export type RecurringRuleCreate =
  components["schemas"]["RecurringRuleCreateRequest"];
export type SavingsContributionCreate =
  components["schemas"]["SavingsContributionCreateRequest"];
export type SavingsGoal = components["schemas"]["SavingsGoalResponse"];
export type SavingsGoalCreate =
  components["schemas"]["SavingsGoalCreateRequest"];
export type SavingsGoalUpdate =
  components["schemas"]["SavingsGoalUpdateRequest"];
export type Transaction = components["schemas"]["TransactionResponse"];
export type TransactionCreate =
  components["schemas"]["TransactionCreateRequest"];
export type TransactionUpdate =
  components["schemas"]["TransactionUpdateRequest"];
export type TransferCreate = components["schemas"]["TransferCreateRequest"];

type AccountList = components["schemas"]["AccountListResponse"];
type BudgetList = components["schemas"]["BudgetListResponse"];
type CategoryList = components["schemas"]["CategoryListResponse"];
type RecurringRule = components["schemas"]["RecurringRuleResponse"];
type SavingsGoalList = components["schemas"]["SavingsGoalListResponse"];
type TransactionList = components["schemas"]["TransactionListResponse"];
type TransferResponse = components["schemas"]["TransferResponse"];

export type TransactionTypeFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer";

export function apiPath(path: string): ApiPath {
  return path as ApiPath;
}

export function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listAccounts(): Promise<Account[]> {
  const response = await apiGet<AccountList>("/api/v1/accounts", {
    params: { include_archived: false, limit: 100 },
  });
  return response.items;
}

export async function listCategories(
  kind?: "income" | "expense",
): Promise<Category[]> {
  const response = await apiGet<CategoryList>("/api/v1/categories", {
    params: { kind, include_archived: false, limit: 100 },
  });
  return response.items;
}

export async function listTransactions(params: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  search?: string;
  type?: TransactionTypeFilter;
}): Promise<Transaction[]> {
  const baseParams = {
    date_from: params.dateFrom,
    date_to: params.dateTo,
    limit: params.limit ?? 100,
    search: params.search || undefined,
  };

  if (params.type === "transfer") {
    const [debits, credits] = await Promise.all([
      apiGet<TransactionList>("/api/v1/transactions", {
        params: { ...baseParams, type: "transfer_debit" },
      }),
      apiGet<TransactionList>("/api/v1/transactions", {
        params: { ...baseParams, type: "transfer_credit" },
      }),
    ]);
    return [...debits.items, ...credits.items].sort(
      (a, b) =>
        new Date(b.transaction_at).getTime() -
        new Date(a.transaction_at).getTime(),
    );
  }

  const response = await apiGet<TransactionList>("/api/v1/transactions", {
    params: {
      ...baseParams,
      type: params.type === "all" ? undefined : params.type,
    },
  });
  return response.items;
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiGet<Transaction>(apiPath(`/api/v1/transactions/${id}`));
}

export function createTransaction(body: TransactionCreate) {
  return apiPost<TransactionCreate, Transaction>(
    "/api/v1/transactions",
    body,
    { headers: { "Idempotency-Key": createIdempotencyKey("txn") } },
  );
}

export function updateTransaction(id: string, body: TransactionUpdate) {
  return apiPatch<TransactionUpdate, Transaction>(
    apiPath(`/api/v1/transactions/${id}`),
    body,
  );
}

export function deleteTransaction(id: string) {
  return apiDelete<void>(apiPath(`/api/v1/transactions/${id}`));
}

export function createTransfer(body: TransferCreate) {
  return apiPost<TransferCreate, TransferResponse>(
    "/api/v1/transactions/transfers",
    body,
    { headers: { "Idempotency-Key": createIdempotencyKey("transfer") } },
  );
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const response = await apiGet<BudgetList>("/api/v1/budgets", {
    params: { month, include_archived: false, limit: 100 },
  });
  return response.items;
}

export function createBudget(body: BudgetCreate) {
  return apiPost<BudgetCreate, Budget>("/api/v1/budgets", body);
}

export function deleteBudget(id: string) {
  return apiDelete<void>(apiPath(`/api/v1/budgets/${id}`));
}

export async function listSavingsGoals(
  status: "active" | "completed" | "all",
): Promise<SavingsGoal[]> {
  const response = await apiGet<SavingsGoalList>("/api/v1/savings-goals", {
    params: { status, limit: 100 },
  });
  return response.items;
}

export function getSavingsGoal(id: string) {
  return apiGet<SavingsGoal>(apiPath(`/api/v1/savings-goals/${id}`));
}

export function createSavingsGoal(body: SavingsGoalCreate) {
  return apiPost<SavingsGoalCreate, SavingsGoal>("/api/v1/savings-goals", body);
}

export function updateSavingsGoal(id: string, body: SavingsGoalUpdate) {
  return apiPatch<SavingsGoalUpdate, SavingsGoal>(
    apiPath(`/api/v1/savings-goals/${id}`),
    body,
  );
}

export function deleteSavingsGoal(id: string) {
  return apiDelete<void>(apiPath(`/api/v1/savings-goals/${id}`));
}

export function createSavingsContribution(
  goalId: string,
  body: SavingsContributionCreate,
) {
  return apiPost<SavingsContributionCreate, SavingsGoal>(
    apiPath(`/api/v1/savings-goals/${goalId}/contributions`),
    body,
  );
}

export function createRecurringRule(body: RecurringRuleCreate) {
  return apiPost<RecurringRuleCreate, RecurringRule>(
    "/api/v1/recurring-rules",
    body,
  );
}
