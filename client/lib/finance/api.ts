import type { components } from "@/generated/api-types";
import {
  apiDelete,
  apiGet,
  apiPatch,
  type ApiPath,
  apiPost,
} from "@/lib/api/client";

export type Account = components["schemas"]["AccountResponse"];
export type AccountCreate = components["schemas"]["AccountCreateRequest"];
export type Budget = components["schemas"]["BudgetResponse"];
export type BudgetCreate = components["schemas"]["BudgetCreateRequest"];
export type BudgetUpdate = components["schemas"]["BudgetUpdateRequest"];
export type Category = components["schemas"]["CategoryResponse"];
export type LoanPerson = components["schemas"]["LoanPersonResponse"];
export type LoanPersonCreate =
  components["schemas"]["LoanPersonCreateRequest"];
export type LoanPersonUpdate =
  components["schemas"]["LoanPersonUpdateRequest"];
export type LoanRecord = components["schemas"]["LoanRecordResponse"];
export type LoanRecordCreate =
  components["schemas"]["LoanRecordCreateRequest"];
export type LoanRecordUpdate =
  components["schemas"]["LoanRecordUpdateRequest"];
export type LoanSettlement =
  components["schemas"]["LoanSettlementResponse"];
export type LoanSettlementCreate =
  components["schemas"]["LoanSettlementCreateRequest"];
export type LoanSummary = components["schemas"]["LoanSummaryResponse"];
export type RecurringRuleCreate =
  components["schemas"]["RecurringRuleCreateRequest"];
export type SavingsContributionCreate =
  components["schemas"]["SavingsContributionCreateRequest"];
export type SavingsGoal = components["schemas"]["SavingsGoalResponse"];
export type SavingsGoalCreate =
  components["schemas"]["SavingsGoalCreateRequest"];
export type SavingsGoalUpdate =
  components["schemas"]["SavingsGoalUpdateRequest"];
export type SavingsTransferCreate =
  components["schemas"]["SavingsTransferCreateRequest"];
export type Transaction = components["schemas"]["TransactionResponse"];
export type TransactionCreate =
  components["schemas"]["TransactionCreateRequest"];
export type TransactionUpdate =
  components["schemas"]["TransactionUpdateRequest"];
export type TransferCreate = components["schemas"]["TransferCreateRequest"];

type AccountList = components["schemas"]["AccountListResponse"];
type BudgetList = components["schemas"]["BudgetListResponse"];
type CategoryList = components["schemas"]["CategoryListResponse"];
type LoanPersonList = components["schemas"]["LoanPersonListResponse"];
type LoanRecordList = components["schemas"]["LoanRecordListResponse"];
type LoanSettlementList = components["schemas"]["LoanSettlementListResponse"];
type RecurringRule = components["schemas"]["RecurringRuleResponse"];
type SavingsGoalList = components["schemas"]["SavingsGoalListResponse"];
type SavingsTransferResponse =
  components["schemas"]["SavingsTransferResponse"];
type TransactionList = components["schemas"]["TransactionListResponse"];
type TransferResponse = components["schemas"]["TransferResponse"];

export type TransactionTypeFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer";
export type LoanDirectionFilter = "all" | "given" | "taken";
export type LoanStatusFilter = "all" | "open" | "settled" | "archived";

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

export function createAccount(body: AccountCreate) {
  return apiPost<AccountCreate, Account>("/api/v1/accounts", body);
}

export function deleteAccount(id: string) {
  return apiDelete<Account>(apiPath(`/api/v1/accounts/${id}`));
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

export function createSavingsTransfer(body: SavingsTransferCreate) {
  return apiPost<SavingsTransferCreate, SavingsTransferResponse>(
    "/api/v1/transactions/savings-transfers",
    body,
    {
      headers: { "Idempotency-Key": createIdempotencyKey("savings-transfer") },
    },
  );
}

export async function listBudgets(
  month: string,
  config?: { signal?: AbortSignal },
): Promise<Budget[]> {
  const response = await apiGet<BudgetList>("/api/v1/budgets", {
    params: { month, include_archived: false, limit: 100 },
    signal: config?.signal,
  });
  return response.items;
}

export function createBudget(body: BudgetCreate) {
  return apiPost<BudgetCreate, Budget>("/api/v1/budgets", body);
}

export function updateBudget(id: string, body: BudgetUpdate) {
  return apiPatch<BudgetUpdate, Budget>(apiPath(`/api/v1/budgets/${id}`), body);
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

export async function listLoanPeople(
  includeArchived = false,
): Promise<LoanPerson[]> {
  const response = await apiGet<LoanPersonList>("/api/v1/loans/people", {
    params: { include_archived: includeArchived, limit: 100 },
  });
  return response.items;
}

export function createLoanPerson(body: LoanPersonCreate) {
  return apiPost<LoanPersonCreate, LoanPerson>("/api/v1/loans/people", body);
}

export function updateLoanPerson(id: string, body: LoanPersonUpdate) {
  return apiPatch<LoanPersonUpdate, LoanPerson>(
    apiPath(`/api/v1/loans/people/${id}`),
    body,
  );
}

export function deleteLoanPerson(id: string) {
  return apiDelete<LoanPerson>(apiPath(`/api/v1/loans/people/${id}`));
}

export async function listLoanRecords(params?: {
  direction?: LoanDirectionFilter;
  personId?: string;
  status?: LoanStatusFilter;
}): Promise<LoanRecord[]> {
  const response = await apiGet<LoanRecordList>("/api/v1/loans/records", {
    params: {
      direction:
        params?.direction && params.direction !== "all"
          ? params.direction
          : undefined,
      limit: 100,
      person_id: params?.personId,
      status: params?.status ?? "all",
    },
  });
  return response.items;
}

export function getLoanRecord(id: string) {
  return apiGet<LoanRecord>(apiPath(`/api/v1/loans/records/${id}`));
}

export function createLoanRecord(body: LoanRecordCreate) {
  return apiPost<LoanRecordCreate, LoanRecord>("/api/v1/loans/records", body);
}

export function updateLoanRecord(id: string, body: LoanRecordUpdate) {
  return apiPatch<LoanRecordUpdate, LoanRecord>(
    apiPath(`/api/v1/loans/records/${id}`),
    body,
  );
}

export function deleteLoanRecord(id: string) {
  return apiDelete<LoanRecord>(apiPath(`/api/v1/loans/records/${id}`));
}

export function getLoanSummary(currency?: string) {
  return apiGet<LoanSummary>("/api/v1/loans/summary", {
    params: { currency },
  });
}

export async function listLoanSettlements(
  recordId: string,
): Promise<LoanSettlement[]> {
  const response = await apiGet<LoanSettlementList>(
    apiPath(`/api/v1/loans/records/${recordId}/settlements`),
    { params: { limit: 100 } },
  );
  return response.items;
}

export function createLoanSettlement(
  recordId: string,
  body: LoanSettlementCreate,
) {
  return apiPost<LoanSettlementCreate, LoanSettlement>(
    apiPath(`/api/v1/loans/records/${recordId}/settlements`),
    body,
  );
}
