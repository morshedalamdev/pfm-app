import type { Account, Category, Transaction, TransactionPeriod } from "@/lib/transactions/types";

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

export function transactionDateRange(period: TransactionPeriod, selectedDate?: string): { dateFrom: string; dateTo: string } {
  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const to = addDays(startOfDay(selected), 1);
  const from = startOfDay(selected);
  if (!selectedDate && period === "week") from.setDate(from.getDate() - 7);
  if (!selectedDate && period === "month") from.setMonth(from.getMonth() - 1);
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

export function isIncomingTransaction(transaction: Transaction): boolean {
  return transaction.type === "income" || transaction.type === "transfer_credit";
}

export function isTransferTransaction(transaction: Transaction): boolean {
  return transaction.type.startsWith("transfer");
}

export function transactionGroupLabel(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date(value));
}

export function transactionTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function transactionTitle(transaction: Transaction, categories: Category[]): string {
  if (transaction.description?.trim()) return transaction.description;
  if (isTransferTransaction(transaction)) return isIncomingTransaction(transaction) ? "Transfer received" : "Transfer sent";
  return categories.find((category) => category.id === transaction.category_id)?.name ?? (transaction.type === "income" ? "Income" : "Expense");
}

export function transactionSubtitle(transaction: Transaction, accounts: Account[], categories: Category[]): string {
  const account = accounts.find((item) => item.id === transaction.account_id)?.name ?? "Account";
  const category = categories.find((item) => item.id === transaction.category_id)?.name;
  return [category ?? transaction.type.replaceAll("_", " "), account].join(" · ");
}

export function groupTransactions(transactions: Transaction[]): Array<readonly [string, Transaction[]]> {
  const groups = new Map<string, Transaction[]>();
  transactions.forEach((transaction) => {
    const label = transactionGroupLabel(transaction.transaction_at);
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  });
  return [...groups.entries()];
}
