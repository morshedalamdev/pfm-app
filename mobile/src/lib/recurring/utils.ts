import type { RecurringRule } from "@/lib/recurring/types";

export function localDateTime(iso = new Date().toISOString()): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function recurringTitle(rule: RecurringRule): string {
  return rule.description?.trim() || `${rule.frequency} ${rule.transaction_type}`;
}

export function recurringCadence(rule: Pick<RecurringRule, "frequency" | "interval_count">): string {
  if (rule.interval_count === 1) return rule.frequency;
  const plural = rule.frequency === "daily" ? "days" : rule.frequency === "weekly" ? "weeks" : rule.frequency === "monthly" ? "months" : "years";
  return `every ${rule.interval_count} ${plural}`;
}

export function formatRecurringDate(value: string, timezone?: string): string {
  try { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(value)); }
  catch { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)); }
}

export function isPositiveMoney(value: string): boolean {
  return /^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/.test(value.trim());
}
