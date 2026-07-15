import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { CircleDollarSign } from "lucide-react";

import { cn } from "@/lib/utils";

import { IconContainer } from "./layout";
import { LinearProgress } from "./progress";
import { StatusBadge, type FinanceStatus } from "./status";
import { type FinanceTone } from "./tokens";
import {
  ChangeBadge,
  MoneyValue,
  PercentageValue,
} from "./values";

export function TransactionRow({
  account,
  actions,
  amount,
  category,
  categoryIcon = CircleDollarSign,
  className,
  currency = "USD",
  date,
  description,
  selected = false,
  tags = [],
  type,
}: {
  account?: React.ReactNode;
  actions?: React.ReactNode;
  amount: number | string;
  category: React.ReactNode;
  categoryIcon?: LucideIcon;
  className?: string;
  currency?: string;
  date?: React.ReactNode;
  description?: React.ReactNode;
  selected?: boolean;
  tags?: React.ReactNode[];
  type: "expense" | "income" | "transfer";
}) {
  const tone: FinanceTone =
    type === "income" ? "income" : type === "transfer" ? "info" : "expense";
  const signDisplay = type === "transfer" ? "never" : "always";

  return (
    <div
      data-selected={selected || undefined}
      data-slot="transaction-row"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-md border border-transparent p-3",
        "data-[selected=true]:border-primary-border data-[selected=true]:bg-primary-soft/45",
        className,
      )}
    >
      <IconContainer icon={categoryIcon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{category}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[description, account, date].filter(Boolean).map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 ? " · " : null}
              {item}
            </React.Fragment>
          ))}
        </p>
        {tags.length > 0 ? (
          <div className="mt-1 flex min-w-0 flex-wrap gap-1">
            {tags.map((tag, index) => (
              <span
                className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                key={index}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MoneyValue
          currency={currency}
          signDisplay={signDisplay}
          size="sm"
          tone={tone}
          value={amount}
        />
        {actions}
      </div>
    </div>
  );
}

export function BudgetProgressRow({
  actions,
  category,
  className,
  currency = "USD",
  limit,
  percentage,
  remaining,
  spent,
  status,
}: {
  actions?: React.ReactNode;
  category: React.ReactNode;
  className?: string;
  currency?: string;
  limit: number | string;
  percentage: number | string;
  remaining: number | string;
  spent: number | string;
  status?: FinanceStatus;
}) {
  return (
    <div
      className={cn("space-y-3 rounded-md border border-border bg-card p-3", className)}
      data-slot="budget-progress-row"
    >
      <div className="flex min-w-0 items-start gap-3">
        <IconContainer icon={CircleDollarSign} tone="expense" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{category}</p>
          <p className="text-xs text-muted-foreground">
            <PercentageValue size="sm" value={percentage} /> used
          </p>
        </div>
        <div className="shrink-0 text-right">
          <MoneyValue currency={currency} size="sm" value={spent} />
          <p className="text-xs text-muted-foreground">
            of <MoneyValue currency={currency} size="sm" value={limit} />
          </p>
        </div>
        {actions}
      </div>
      <LinearProgress
        aria-label="Budget progress"
        showValue
        tone={Number(percentage) > 100 ? "destructive" : "expense"}
        value={percentage}
      />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Remaining: <MoneyValue currency={currency} size="sm" value={remaining} />
        </span>
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </div>
  );
}

export function ReportCategoryRow({
  amount,
  category,
  className,
  currency = "USD",
  icon = CircleDollarSign,
  percentage,
  periodComparison,
  tone = "primary",
}: {
  amount: number | string;
  category: React.ReactNode;
  className?: string;
  currency?: string;
  icon?: LucideIcon;
  percentage: number | string;
  periodComparison?: number | string;
  tone?: FinanceTone;
}) {
  return (
    <div
      className={cn("space-y-2 rounded-md border border-border bg-card p-3", className)}
      data-slot="report-category-row"
    >
      <div className="flex min-w-0 items-center gap-3">
        <IconContainer icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{category}</p>
          <p className="text-xs text-muted-foreground">
            <PercentageValue size="sm" value={percentage} /> of total
          </p>
        </div>
        <div className="shrink-0 text-right">
          <MoneyValue currency={currency} size="sm" value={amount} />
          {periodComparison !== undefined ? (
            <ChangeBadge value={periodComparison} />
          ) : null}
        </div>
      </div>
      <LinearProgress aria-label="Report category share" tone={tone} value={percentage} />
    </div>
  );
}
