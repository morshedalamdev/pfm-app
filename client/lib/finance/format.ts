export function decimalInput(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

export function formatMoney(value: string | number, currency = "USD"): string {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value: string | number): string {
  const percent = typeof value === "number" ? value : Number(value);
  return `${Math.round(Number.isFinite(percent) ? percent : 0)}%`;
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string): {
  end: string;
  start: string;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));
  return {
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  };
}

export function toDateOnly(date?: Date): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function toDateTime(date?: Date): string {
  return (date ?? new Date()).toISOString();
}
