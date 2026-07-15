import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarClock, CircleDollarSign } from "lucide-react";

import { cn } from "@/lib/utils";

import { CardSurface, IconContainer, SectionHeader } from "./layout";
import { CircularProgress, LinearProgress } from "./progress";
import { StatusBadge, type FinanceStatus } from "./status";
import { type FinanceTone } from "./tokens";
import {
  ChangeIndicator,
  MoneyValue,
  PercentageValue,
} from "./values";

type ActionSlot = React.ReactNode;

export type FinancialMetricCardProps = {
  amount: number | string;
  className?: string;
  compact?: boolean;
  currency?: string;
  icon?: LucideIcon;
  supportingText?: React.ReactNode;
  title: React.ReactNode;
  tone?: FinanceTone;
  trend?: React.ReactNode;
};

export function FinancialMetricCard({
  amount,
  className,
  compact = false,
  currency = "USD",
  icon: Icon = CircleDollarSign,
  supportingText,
  title,
  tone = "primary",
  trend,
}: FinancialMetricCardProps) {
  return (
    <CardSurface
      className={cn("flex min-w-0 flex-col gap-3", compact && "p-3", className)}
      data-slot="financial-metric-card"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {title}
          </p>
          <MoneyValue
            className="mt-1"
            compact={compact}
            currency={currency}
            size={compact ? "lg" : "xl"}
            value={amount}
          />
        </div>
        <IconContainer icon={Icon} size={compact ? "sm" : "md"} tone={tone} />
      </div>
      {(trend || supportingText) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {trend}
          {supportingText ? <span className="truncate">{supportingText}</span> : null}
        </div>
      )}
    </CardSurface>
  );
}

export type FinancialSummaryCardItem = {
  label: React.ReactNode;
  value: React.ReactNode;
};

export function FinancialSummaryCard({
  action,
  amount,
  className,
  currency = "USD",
  icon,
  items = [],
  status,
  subtitle,
  title,
  tone = "primary",
}: {
  action?: ActionSlot;
  amount: number | string;
  className?: string;
  currency?: string;
  icon?: LucideIcon;
  items?: FinancialSummaryCardItem[];
  status?: React.ReactNode;
  subtitle?: React.ReactNode;
  title: React.ReactNode;
  tone?: FinanceTone;
}) {
  return (
    <CardSurface className={cn("space-y-4", className)} data-slot="financial-summary-card">
      <SectionHeader
        action={action}
        description={subtitle}
        title={
          <span className="flex items-center gap-2">
            {icon ? <IconContainer icon={icon} size="sm" tone={tone} /> : null}
            {title}
          </span>
        }
      />
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <MoneyValue currency={currency} size="xl" value={amount} />
        {status}
      </div>
      {items.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div className="min-w-0" key={index}>
              <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
              <dd className="finance-number truncate text-sm font-semibold text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </CardSurface>
  );
}

export function AccountCard({
  actions,
  accountName,
  accountType,
  balance,
  className,
  currency,
  disabled = false,
  percentageOfTotal,
  recentActivity,
  status,
}: {
  accountName: React.ReactNode;
  accountType: React.ReactNode;
  actions?: ActionSlot;
  balance: number | string;
  className?: string;
  currency: string;
  disabled?: boolean;
  percentageOfTotal?: number | string;
  recentActivity?: React.ReactNode;
  status?: "archived" | "default" | "disabled";
}) {
  const statusNode =
    status === "default" ? (
      <StatusBadge label="Default" status="active" />
    ) : status === "disabled" ? (
      <StatusBadge status="disabled" />
    ) : status === "archived" ? (
      <StatusBadge status="archived" />
    ) : null;

  return (
    <CardSurface
      className={cn("space-y-4", className)}
      data-slot="account-card"
      disabled={disabled}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconContainer icon={CircleDollarSign} tone="primary" />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{accountName}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {accountType} · {currency}
            </p>
          </div>
        </div>
        {actions}
      </div>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <MoneyValue currency={currency} size="xl" value={balance} />
        {statusNode}
      </div>
      {(percentageOfTotal !== undefined || recentActivity) && (
        <div className="flex min-w-0 flex-wrap gap-3 text-sm text-muted-foreground">
          {percentageOfTotal !== undefined ? (
            <span>
              <PercentageValue size="sm" value={percentageOfTotal} /> of total
            </span>
          ) : null}
          {recentActivity ? <span className="truncate">{recentActivity}</span> : null}
        </div>
      )}
    </CardSurface>
  );
}

export function SavingsGoalCard({
  actions,
  className,
  expectedCompletion,
  goalName,
  progress,
  remainingAmount,
  requiredContribution,
  savedAmount,
  status,
  targetAmount,
  targetDate,
  currency = "USD",
}: {
  actions?: ActionSlot;
  className?: string;
  currency?: string;
  expectedCompletion?: React.ReactNode;
  goalName: React.ReactNode;
  progress: number | string;
  remainingAmount: number | string;
  requiredContribution?: React.ReactNode;
  savedAmount: number | string;
  status?: FinanceStatus;
  targetAmount: number | string;
  targetDate?: React.ReactNode;
}) {
  return (
    <CardSurface className={cn("space-y-4", className)} data-slot="savings-goal-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <SectionHeader description={targetDate} title={goalName} />
        {actions}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <MoneyValue currency={currency} size="lg" value={savedAmount} />
          <p className="text-xs text-muted-foreground">
            of <MoneyValue currency={currency} size="sm" value={targetAmount} />
          </p>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <LinearProgress
        aria-label="Savings goal progress"
        showValue
        tone="saving"
        value={progress}
      />
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <span>Remaining: <MoneyValue currency={currency} size="sm" value={remainingAmount} /></span>
        {expectedCompletion ? <span>{expectedCompletion}</span> : null}
        {requiredContribution ? <span>{requiredContribution}</span> : null}
      </div>
    </CardSurface>
  );
}

export function LoanDebtCard({
  account,
  actions,
  className,
  currency = "USD",
  direction,
  originalAmount,
  outstandingAmount,
  person,
  progress,
  repayDate,
  status,
}: {
  account?: React.ReactNode;
  actions?: ActionSlot;
  className?: string;
  currency?: string;
  direction: "given" | "taken";
  originalAmount: number | string;
  outstandingAmount: number | string;
  person: React.ReactNode;
  progress: number | string;
  repayDate?: React.ReactNode;
  status?: FinanceStatus;
}) {
  const tone: FinanceTone = direction === "given" ? "debt" : "income";

  return (
    <CardSurface className={cn("space-y-4", className)} data-slot="loan-debt-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{person}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {direction === "given" ? "Loan given" : "Loan taken"}
            {account ? ` · ${account}` : ""}
          </p>
        </div>
        {actions}
      </div>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <MoneyValue currency={currency} size="lg" value={outstandingAmount} />
          <p className="text-xs text-muted-foreground">
            of <MoneyValue currency={currency} size="sm" value={originalAmount} />
          </p>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <LinearProgress aria-label="Loan repayment progress" tone={tone} value={progress} />
      {repayDate ? (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarClock aria-hidden="true" className="size-4" />
          <span className="truncate">{repayDate}</span>
        </p>
      ) : null}
    </CardSurface>
  );
}

export function UpcomingCommitmentRow({
  amount,
  className,
  currency = "USD",
  date,
  description,
  icon = CalendarClock,
  status,
  title,
  tone = "warning",
}: {
  amount?: number | string;
  className?: string;
  currency?: string;
  date?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  status?: FinanceStatus;
  title: React.ReactNode;
  tone?: FinanceTone;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-md border border-border bg-card p-3",
        className,
      )}
      data-slot="upcoming-commitment-row"
    >
      <IconContainer icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {description ?? date}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {amount !== undefined ? (
          <MoneyValue currency={currency} size="sm" value={amount} />
        ) : null}
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </div>
  );
}

export function MetricTrend({
  className,
  kind = "percent",
  value,
}: {
  className?: string;
  kind?: "currency" | "number" | "percent";
  value: number | string;
}) {
  return (
    <ChangeIndicator className={className} kind={kind} value={value} />
  );
}

export function SummaryLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold text-primary",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </span>
  );
}
