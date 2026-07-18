import Decimal from "decimal.js";
import { format } from "date-fns";

export function currentMonthKey(date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function monthRange(month: string): { endAt: string; startAt: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Choose a valid reporting month");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year!, monthNumber! - 1, 1));
  const end = new Date(Date.UTC(year!, monthNumber!, 1));
  return { endAt: end.toISOString(), startAt: start.toISOString() };
}

export function reportMonthLabel(month: string): string {
  const { startAt } = monthRange(month);
  return format(new Date(startAt), "MMMM yyyy");
}

export function cashFlowHeight(amount: string, maximum: string): number {
  try {
    const max = new Decimal(maximum);
    if (max.lte(0)) return 0;
    return Math.max(3, Math.min(100, new Decimal(amount).div(max).times(100).toNumber()));
  } catch {
    return 0;
  }
}

export function reportPercent(value: string): number {
  try {
    return Math.max(0, Math.min(100, new Decimal(value).toNumber()));
  } catch {
    return 0;
  }
}

export function formatReportPercent(value: string): string {
  try {
    const decimal = new Decimal(value);
    const sign = decimal.isNegative() ? "−" : decimal.isPositive() ? "+" : "";
    return `${sign}${decimal.abs().toFixed(1)}%`;
  } catch {
    return value;
  }
}
