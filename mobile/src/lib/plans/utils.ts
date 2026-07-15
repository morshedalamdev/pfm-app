import Decimal from "decimal.js";

export function planMonthRange(month: string): { end: string; start: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month");
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year!, monthNumber! - 1, 1));
  const end = new Date(Date.UTC(year!, monthNumber!, 1));
  return { end: end.toISOString().slice(0, 10), start: start.toISOString().slice(0, 10) };
}

export function progressPercent(value: string): number {
  try { return Math.max(0, Math.min(100, new Decimal(value).toNumber())); } catch { return 0; }
}

export function isPositiveMoney(value: string): boolean {
  return /^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/.test(value.trim());
}
