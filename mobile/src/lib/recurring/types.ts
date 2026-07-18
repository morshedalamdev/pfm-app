import type { components } from "@generated/api-types";

export type Account = components["schemas"]["AccountResponse"];
export type Category = components["schemas"]["CategoryResponse"];
export type RecurringRule = components["schemas"]["RecurringRuleResponse"];
export type RecurringRuleCreate = components["schemas"]["RecurringRuleCreateRequest"];
export type RecurringRuleUpdate = components["schemas"]["RecurringRuleUpdateRequest"];
export type RecurringRuleList = components["schemas"]["RecurringRuleListResponse"];
export type ExpenseReminder = components["schemas"]["RecurringExpenseReminderResponse"];
export type ExpenseReminderList = components["schemas"]["RecurringExpenseReminderListResponse"];
export type IncomeReminder = components["schemas"]["RecurringIncomeReminderResponse"];
export type IncomeReminderList = components["schemas"]["RecurringIncomeReminderListResponse"];
export type ExpensePaidResponse = components["schemas"]["RecurringExpensePaidResponse"];
export type IncomeReceivedResponse = components["schemas"]["RecurringIncomeReceivedResponse"];

export type DueReminder = (ExpenseReminder & { reminder_type: "expense" }) | (IncomeReminder & { reminder_type: "income" });
export type RecurringOptions = Readonly<{ accounts: Account[]; categories: Category[] }>;
export type RecurringOverview = RecurringOptions & Readonly<{ reminders: DueReminder[]; rules: RecurringRule[] }>;
