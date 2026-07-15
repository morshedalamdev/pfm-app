export type FinanceTone =
  | "neutral"
  | "primary"
  | "income"
  | "expense"
  | "saving"
  | "debt"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "muted";

export type FinanceSize = "sm" | "md" | "lg";

export const toneTextClasses: Record<FinanceTone, string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  income: "text-income",
  expense: "text-expense",
  saving: "text-saving",
  debt: "text-debt",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  muted: "text-muted-foreground",
};

export const toneSoftClasses: Record<FinanceTone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  primary: "bg-primary-soft text-primary-soft-foreground border-primary-border",
  income: "bg-income-soft text-income-foreground border-income/20",
  expense: "bg-expense-soft text-expense-foreground border-expense/20",
  saving: "bg-saving-soft text-saving-foreground border-saving/20",
  debt: "bg-debt-soft text-debt-foreground border-debt/20",
  success: "bg-success-soft text-success-foreground border-success/20",
  warning: "bg-warning-soft text-warning-foreground border-warning/20",
  destructive:
    "bg-destructive-soft text-destructive border-destructive/20 dark:text-destructive-foreground",
  info: "bg-info-soft text-info-foreground border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export const toneFillClasses: Record<FinanceTone, string> = {
  neutral: "bg-muted",
  primary: "bg-primary",
  income: "bg-income",
  expense: "bg-expense",
  saving: "bg-saving",
  debt: "bg-debt",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

export function toneFromSignedValue(value: number): FinanceTone {
  if (value > 0) return "income";
  if (value < 0) return "expense";
  return "muted";
}
