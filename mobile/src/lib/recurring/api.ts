import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import type { AccountList, CategoryList } from "@/lib/transactions/types";
import type { DueReminder, ExpensePaidResponse, ExpenseReminderList, IncomeReceivedResponse, IncomeReminderList, RecurringOptions, RecurringOverview, RecurringRule, RecurringRuleCreate, RecurringRuleList, RecurringRuleUpdate } from "@/lib/recurring/types";

export async function getRecurringOptions(): Promise<RecurringOptions> {
  const [accounts, expenses, incomes] = await Promise.all([
    getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts."),
    getBackendJson<CategoryList>("categories?kind=expense&limit=100", "We couldn't load your expense categories."),
    getBackendJson<CategoryList>("categories?kind=income&limit=100", "We couldn't load your income categories."),
  ]);
  const categories = new Map(
    [...expenses.items, ...incomes.items]
      .filter((item) => !item.is_archived)
      .map((item) => [item.id, item]),
  );
  return {
    accounts: accounts.items.filter((item) => !item.is_archived && !item.is_disabled),
    categories: [...categories.values()],
  };
}

export async function getRecurringOverview(): Promise<RecurringOverview> {
  const [options, rules, expenseResult, incomeResult] = await Promise.all([
    getRecurringOptions(),
    getBackendJson<RecurringRuleList>("recurring-rules?status=all&limit=100", "We couldn't load recurring items."),
    getBackendJson<ExpenseReminderList>("recurring-rules/due-expenses", "We couldn't load due expenses."),
    getBackendJson<IncomeReminderList>("recurring-rules/due-incomes", "We couldn't load due income."),
  ]);
  const reminders: DueReminder[] = [
    ...expenseResult.items.map((item) => ({ ...item, reminder_type: "expense" as const })),
    ...incomeResult.items.map((item) => ({ ...item, reminder_type: "income" as const })),
  ].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  return { ...options, reminders, rules: rules.items.filter((item) => item.status !== "archived") };
}

export function getRecurringRule(id: string) {
  return getBackendJson<RecurringRule>(`recurring-rules/${encodeURIComponent(id)}`, "We couldn't load this recurring item.");
}

export async function getRecurringEditorData(id?: string) {
  const [options, rule] = await Promise.all([getRecurringOptions(), id ? getRecurringRule(id) : Promise.resolve(null)]);
  return { ...options, rule };
}

export function createRecurringRule(payload: RecurringRuleCreate) {
  return sendBackendJson<RecurringRule>("recurring-rules", "POST", payload);
}

export function updateRecurringRule(id: string, payload: RecurringRuleUpdate) {
  return sendBackendJson<RecurringRule>(`recurring-rules/${encodeURIComponent(id)}`, "PATCH", payload);
}

export function changeRecurringState(rule: RecurringRule) {
  const action = rule.status === "paused" ? "resume" : "pause";
  return sendBackendJson<RecurringRule>(`recurring-rules/${encodeURIComponent(rule.id)}/${action}`, "POST");
}

export function deleteRecurringRule(id: string) {
  return sendBackendJson<RecurringRule>(`recurring-rules/${encodeURIComponent(id)}`, "DELETE");
}

export function completeReminder(reminder: DueReminder) {
  const now = new Date().toISOString();
  return reminder.reminder_type === "expense"
    ? sendBackendJson<ExpensePaidResponse>(`recurring-rules/${encodeURIComponent(reminder.rule.id)}/paid`, "POST", { paid_at: now })
    : sendBackendJson<IncomeReceivedResponse>(`recurring-rules/${encodeURIComponent(reminder.rule.id)}/received`, "POST", { received_at: now });
}
