import Decimal from "decimal.js";
import { format } from "date-fns";

import type { Transaction } from "@/lib/home/types";

export type TransactionTone = "blue" | "coral" | "orange" | "purple";

export type TransactionViewModel = Readonly<{
  accent: TransactionTone;
  amount: string;
  dateLabel: string;
  isNegative: boolean;
  name: string;
  subtitle: string;
}>;

function moneyParts(value: string): { fraction: string; whole: string } {
  const [whole, fraction] = new Decimal(value).abs().toFixed(2).split(".");
  return { fraction, whole: whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") };
}

function currencyAffixes(currency: string): { prefix: string; suffix: string } {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      currency,
      currencyDisplay: "narrowSymbol",
      style: "currency",
    }).formatToParts(0);
    const integerIndex = parts.findIndex((part) => part.type === "integer");
    const fractionIndex = parts.findIndex((part) => part.type === "fraction");
    const prefix = parts.slice(0, integerIndex).map((part) => part.value).join("");
    const suffix = parts
      .slice(fractionIndex === -1 ? integerIndex + 1 : fractionIndex + 1)
      .map((part) => part.value)
      .join("");
    return { prefix, suffix };
  } catch {
    return { prefix: `${currency} `, suffix: "" };
  }
}

export function formatMoney(value: string, currency: string): string {
  try {
    const { fraction, whole } = moneyParts(value);
    const { prefix, suffix } = currencyAffixes(currency);
    return `${prefix}${whole}.${fraction}${suffix}`;
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatSignedMoney(value: string, currency: string): string {
  try {
    const decimal = new Decimal(value);
    const sign = decimal.isNegative() ? "−" : decimal.isPositive() ? "+" : "";
    return `${sign}${formatMoney(decimal.abs().toString(), currency)}`;
  } catch {
    return formatMoney(value, currency);
  }
}

export function splitMoney(value: string): { fraction: string; whole: string } {
  const decimalIndex = value.lastIndexOf(".");
  return decimalIndex === -1
    ? { fraction: "", whole: value }
    : { fraction: value.slice(decimalIndex), whole: value.slice(0, decimalIndex) };
}

function transactionIsNegative(type: string): boolean {
  return type === "expense" || type === "transfer_debit";
}

function transactionName(transaction: Transaction): string {
  const description = transaction.description?.trim();
  if (description) return description;
  if (transaction.type === "income") return "Income";
  if (transaction.type === "transfer_credit") return "Transfer received";
  if (transaction.type === "transfer_debit") return "Transfer sent";
  return "Expense";
}

export function mapTransaction(transaction: Transaction): TransactionViewModel {
  const isNegative = transactionIsNegative(transaction.type);
  const accent: TransactionTone = transaction.type === "income"
    ? "blue"
    : transaction.type === "transfer_credit" || transaction.type === "transfer_debit"
      ? "purple"
      : "coral";
  const sign = isNegative ? "−" : "+";

  return {
    accent,
    amount: `${sign}${formatMoney(transaction.amount, transaction.currency)}`,
    dateLabel: format(new Date(transaction.transaction_at), "EEE, d MMM"),
    isNegative,
    name: transactionName(transaction),
    subtitle: transaction.type === "income" ? "Income" : transaction.type === "expense" ? "Expense" : "Transfer",
  };
}

export function formatMonthLabel(startAt: string): string {
  return format(new Date(startAt), "MMMM yyyy");
}
