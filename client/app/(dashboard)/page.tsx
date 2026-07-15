"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  PiggyBankIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";

import { RootChart } from "@/components/charts/RootChart";
import {
  AccountCard,
  BudgetProgressRow,
  CardSkeleton,
  CardSurface,
  EmptyState,
  ErrorState,
  FinancialMetricCard,
  ListSkeleton,
  MoneyValue,
  SectionHeader,
  SavingsGoalCard,
  StatusBadge,
  TransactionRow,
  UpcomingCommitmentRow,
} from "@/components/finance";
import { useRecurringReminders } from "@/components/recurring/RecurringReminderProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/generated/api-types";
import { useDashboardData } from "@/lib/dashboard/useDashboardData";
import { useHomeBalanceSource } from "@/lib/dashboard/useHomeBalanceSource";
import { getAccountTypeLabel } from "@/lib/finance/accountTypes";
import { cn } from "@/lib/utils";

type DashboardPeriod = components["schemas"]["DashboardPeriod"];
type DashboardReport = components["schemas"]["DashboardReportResponse"];

const DASHBOARD_PERIODS: Array<{ label: string; value: DashboardPeriod }> = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export default function HomePage() {
  const {
    accounts,
    balance,
    error: balanceError,
    isLoading: balanceLoading,
    loadBalanceSources,
  } = useHomeBalanceSource();
  const {
    error: commitmentsError,
    isLoading: commitmentsLoading,
    reload: reloadCommitments,
    reminderQueue,
  } = useRecurringReminders();
  const {
    budgets,
    budgetsError,
    budgetsStatus,
    chartBuckets,
    loadBudgets,
    loadReport,
    loadSavingsGoals,
    loadTransactions,
    period,
    report,
    reportError,
    reportStatus,
    savingsError,
    savingsGoals,
    savingsStatus,
    setPeriod,
    setTransactionType,
    transactionType,
    transactions,
    transactionsError,
    transactionsStatus,
  } = useDashboardData();

  const reportLoading = reportStatus === "loading" && !report;
  const budgetPreviews = budgets.slice(0, 3);
  const savingsPreviews = [...savingsGoals]
    .sort((left, right) => {
      if (left.status === right.status) return left.name.localeCompare(right.name);
      if (left.status === "active") return -1;
      if (right.status === "active") return 1;
      return left.status.localeCompare(right.status);
    })
    .slice(0, 3);
  const commitmentPreviews = reminderQueue.slice(0, 3);
  const accountPreviews = accounts.slice(0, 3);
  const accountNamesById = new Map(
    accounts.map((account) => [account.id, account.name]),
  );
  const accountCurrenciesById = new Map(
    accounts.map((account) => [account.id, account.currency]),
  );
  const accountsLoading = balanceLoading && accountPreviews.length === 0;
  const transactionsLoading =
    transactionsStatus === "loading" && transactions.length === 0;
  const reportCurrency = report?.currency ?? "USD";
  const netCashFlow = report ? deriveNetCashFlow(report) : 0;
  const accountCurrencies = new Set(
    accountPreviews.map((account) => account.currency),
  );
  const budgetsLoading = budgetsStatus === "loading" && budgets.length === 0;
  const savingsLoading =
    savingsStatus === "loading" && savingsGoals.length === 0;
  const planningStatus = derivePlanningStatus({
    budgets,
    commitmentsCount: reminderQueue.length,
    netCashFlow,
    reportLoaded: Boolean(report),
    savingsGoals,
  });

  return (
    <Fragment>
      <section className="px-3 pt-4">
        <CardSurface className="overflow-hidden border-primary-border bg-primary-soft/70 p-0 shadow-[var(--shadow-primary-glow)]">
          <div className="space-y-5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-normal text-primary-soft-foreground/80">
                  Current balance
                </p>
                <h1 className="mt-2 text-4xl font-bold leading-tight text-primary-soft-foreground sm:text-5xl">
                  {balanceLoading ? (
                    <Skeleton className="h-11 w-56 max-w-full bg-primary/15" />
                  ) : balance ? (
                    <MoneyValue
                      className="max-w-full whitespace-normal break-words text-inherit"
                      currency={balance.currency}
                      size="xl"
                      value={balance.amount}
                    />
                  ) : (
                    <span className="finance-number">--</span>
                  )}
                </h1>
                <p className="mt-2 text-sm font-medium text-primary-soft-foreground/80">
                  {balanceLoading
                    ? "Loading balance source"
                    : balance?.label ?? "No balance source available"}
                </p>
              </div>
              <DashboardPeriodSelector
                onChange={setPeriod}
                value={period}
              />
            </div>
            {balanceError ? (
              <div className="rounded-md border border-destructive/20 bg-destructive-soft p-3">
                <p className="text-sm font-medium text-destructive">
                  {balanceError}
                </p>
                {!balance ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-fit"
                    onClick={() => void loadBalanceSources()}
                  >
                    Retry balance
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardSurface>
      </section>

      <section className="grid gap-3 p-3 sm:grid-cols-3">
        {reportLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <FinancialMetricCard
              amount={report?.income_amount ?? "0"}
              currency={reportCurrency}
              icon={ArrowUpRightIcon}
              supportingText={`${periodLabel(period)} income`}
              title="Income"
              tone="income"
            />
            <FinancialMetricCard
              amount={report?.expense_amount ?? "0"}
              currency={reportCurrency}
              icon={ArrowDownRightIcon}
              supportingText={`${periodLabel(period)} expenses`}
              title="Expenses"
              tone="expense"
            />
            <FinancialMetricCard
              amount={netCashFlow}
              currency={reportCurrency}
              icon={netCashFlow >= 0 ? WalletCardsIcon : ActivityIcon}
              supportingText={`${periodLabel(period)} income minus expenses`}
              title="Net cash flow"
              tone={netCashFlow > 0 ? "income" : netCashFlow < 0 ? "expense" : "muted"}
            />
          </>
        )}
      </section>
      {reportError && !report && (
        <section className="px-3 pb-3">
          <ErrorState
            description={reportError}
            retryAction={{
              label: "Retry summary",
              onClick: () => void loadReport(),
            }}
            title="Dashboard summary could not be loaded"
          />
        </section>
      )}
      <section>
        <RootChart
          buckets={chartBuckets}
          errorMessage={report ? null : reportError}
          isLoading={reportLoading}
          onPeriodChange={setPeriod}
          onRetry={loadReport}
          onTypeChange={setTransactionType}
          period={period}
          type={transactionType}
          currency={reportCurrency}
        />
      </section>

      <section className="grid gap-3 p-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <CardSurface className="space-y-4">
          <SectionHeader
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/accounts">
                  View all
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
            }
            description={
              accountPreviews.length > 0
                ? accountCurrencies.size === 1
                  ? `${accountPreviews.length} active account${accountPreviews.length === 1 ? "" : "s"} in ${
                      accountPreviews[0]?.currency ?? reportCurrency
                    }`
                  : `${accountPreviews.length} active accounts across ${accountCurrencies.size} currencies`
                : "Current balances by account"
            }
            title="Accounts"
          />
          {accountsLoading ? (
            <div className="grid gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : balanceError && accountPreviews.length === 0 ? (
            <ErrorState
              description={balanceError}
              retryAction={{
                label: "Retry accounts",
                onClick: () => void loadBalanceSources(),
              }}
              title="Accounts could not be loaded"
            />
          ) : accountPreviews.length === 0 ? (
            <EmptyState
              description="Create an account to start tracking balances on the dashboard."
              title="No accounts yet"
            />
          ) : (
            <div className="grid gap-3">
              {accountPreviews.map((account) => (
                <AccountCard
                  accountName={account.name}
                  accountType={getAccountTypeLabel(account.type)}
                  balance={account.current_balance}
                  className="p-3"
                  currency={account.currency}
                  key={account.id}
                  status={account.is_default ? "default" : undefined}
                />
              ))}
            </div>
          )}
        </CardSurface>

        <CardSurface className="space-y-4">
          <SectionHeader
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/transaction">
                  View all transactions
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Latest posted income, expenses, and transfers"
            title="Recent transactions"
          />
        {transactionsLoading ? (
          <ListSkeleton count={6} />
        ) : transactionsError ? (
          <ErrorState
            description={transactionsError}
            retryAction={{
              label: "Retry transactions",
              onClick: () => void loadTransactions(),
            }}
            title="Recent transactions could not be loaded"
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            description="New activity will appear here after the first transaction."
            title="No recent transactions yet"
          />
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((transaction) => (
              <Link
                className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/transaction/${transaction.id}`}
                key={transaction.id}
              >
                <TransactionRow
                  account={
                    accountNamesById.get(transaction.accountId) ??
                    "Unknown account"
                  }
                  amount={transaction.amount}
                  category={transaction.category}
                  className="px-0"
                  currency={
                    accountCurrenciesById.get(transaction.accountId) ??
                    transaction.currency
                  }
                  date={transaction.transactionDate}
                  description={transaction.note}
                  type={normalizeTransactionType(transaction.type)}
                />
              </Link>
            ))}
          </div>
        )}
        </CardSurface>
      </section>

      <section className="grid gap-3 p-3 lg:grid-cols-3">
        <CardSurface className="space-y-4">
          <SectionHeader
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/budget">
                  View all
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Current month progress from recorded expenses"
            title="Budget health"
          />
          {budgetsLoading ? (
            <ListSkeleton count={3} />
          ) : budgetsError ? (
            <ErrorState
              description={budgetsError}
              retryAction={{
                label: "Retry budgets",
                onClick: () => void loadBudgets(),
              }}
              title="Budgets could not be loaded"
            />
          ) : budgetPreviews.length === 0 ? (
            <EmptyState
              description="Budget progress appears here after monthly budgets are set."
              title="No budgets yet"
            />
          ) : (
            <div className="grid gap-3">
              {budgetPreviews.map((budget) => (
                <BudgetProgressRow
                  category={budget.category_name ?? "Overall budget"}
                  currency={budget.currency}
                  key={budget.id}
                  limit={budget.limit_amount}
                  percentage={budget.progress.percent_used}
                  remaining={budget.progress.remaining_amount}
                  spent={budget.progress.spent_amount}
                  status={budget.progress.status}
                />
              ))}
            </div>
          )}
        </CardSurface>

        <CardSurface className="space-y-4">
          <SectionHeader
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/savings">
                  View all
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Active and completed goals from savings progress"
            title="Savings goals"
          />
          {savingsLoading ? (
            <div className="grid gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : savingsError ? (
            <ErrorState
              description={savingsError}
              retryAction={{
                label: "Retry savings",
                onClick: () => void loadSavingsGoals(),
              }}
              title="Savings goals could not be loaded"
            />
          ) : savingsPreviews.length === 0 ? (
            <EmptyState
              description="Savings progress appears here after a goal is created."
              title="No savings goals yet"
            />
          ) : (
            <div className="grid gap-3">
              {savingsPreviews.map((goal) => (
                <SavingsGoalCard
                  currency={goal.currency}
                  goalName={goal.name}
                  key={goal.id}
                  progress={goal.progress.percent_complete}
                  remainingAmount={goal.progress.remaining_amount}
                  savedAmount={goal.progress.saved_amount}
                  status={goal.status === "completed" ? "completed" : "active"}
                  targetAmount={goal.target_amount}
                  targetDate={
                    goal.target_date
                      ? `Target ${formatDateLabel(goal.target_date)}`
                      : "No target date"
                  }
                />
              ))}
            </div>
          )}
        </CardSurface>

        <CardSurface className="space-y-4">
          <SectionHeader
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/transaction">
                  Open transactions
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Due recurring reminders only"
            title="Upcoming commitments"
          />
          {commitmentsLoading && commitmentPreviews.length === 0 ? (
            <ListSkeleton count={3} />
          ) : commitmentsError && commitmentPreviews.length === 0 ? (
            <ErrorState
              description={commitmentsError}
              retryAction={{
                label: "Retry commitments",
                onClick: () => void reloadCommitments(),
              }}
              title="Commitments could not be loaded"
            />
          ) : commitmentPreviews.length === 0 ? (
            <EmptyState
              description="No due recurring reminders are waiting right now."
              title="No commitments due"
            />
          ) : (
            <div className="grid gap-3">
              {commitmentPreviews.map((reminder) => (
                <UpcomingCommitmentRow
                  amount={reminder.rule.amount}
                  currency={reminder.rule.currency}
                  date={formatDateTimeLabel(reminder.due_at)}
                  description={formatCommitmentDescription(reminder)}
                  key={`${reminder.reminder_type}:${reminder.reminder_key}`}
                  status="pending"
                  title={
                    reminder.rule.description ||
                    (reminder.reminder_type === "income"
                      ? "Recurring income"
                      : "Recurring expense")
                  }
                  tone={reminder.reminder_type === "income" ? "income" : "warning"}
                />
              ))}
            </div>
          )}
        </CardSurface>
      </section>

      {planningStatus ? (
        <section className="px-3 pb-[70px]">
          <CardSurface className="space-y-4">
            <SectionHeader
              description={planningStatus.description}
              title="Financial status"
            />
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle">
                <planningStatus.icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {planningStatus.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {planningStatus.detail}
                </p>
              </div>
              <StatusBadge status={planningStatus.status} />
            </div>
          </CardSurface>
        </section>
      ) : null}
    </Fragment>
  );
}

function DashboardPeriodSelector({
  onChange,
  value,
}: {
  onChange: (value: DashboardPeriod) => void;
  value: DashboardPeriod;
}) {
  return (
    <div
      aria-label="Dashboard period"
      className="inline-flex w-fit max-w-full rounded-md border border-primary-border bg-background/70 p-1"
      role="group"
    >
      {DASHBOARD_PERIODS.map((periodOption) => (
        <Button
          aria-pressed={value === periodOption.value}
          className={cn(
            "h-8 w-auto px-3 text-xs",
            value === periodOption.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={periodOption.value}
          onClick={() => onChange(periodOption.value)}
          type="button"
          variant={value === periodOption.value ? "default" : "ghost"}
        >
          {periodOption.label}
        </Button>
      ))}
    </div>
  );
}

function deriveNetCashFlow(report: DashboardReport): number {
  return Number(report.income_amount) - Number(report.expense_amount);
}

function periodLabel(period: DashboardPeriod): string {
  return period === "week" ? "This week" : period === "month" ? "This month" : "This year";
}

function normalizeTransactionType(type: string): "expense" | "income" | "transfer" {
  if (type === "income") return "income";
  if (type.startsWith("transfer")) return "transfer";
  return "expense";
}

function formatDateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTimeLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCommitmentDescription(
  reminder: ReturnType<typeof useRecurringReminders>["reminderQueue"][number],
): string {
  const dueDate = formatDateTimeLabel(reminder.due_at);
  return reminder.reminder_type === "income"
    ? `Income due ${dueDate}`
    : `Expense due ${dueDate}`;
}

function derivePlanningStatus({
  budgets,
  commitmentsCount,
  netCashFlow,
  reportLoaded,
  savingsGoals,
}: {
  budgets: components["schemas"]["BudgetResponse"][];
  commitmentsCount: number;
  netCashFlow: number;
  reportLoaded: boolean;
  savingsGoals: components["schemas"]["SavingsGoalResponse"][];
}) {
  const overBudgetCount = budgets.filter(
    (budget) => budget.progress.status === "over_budget",
  ).length;
  if (overBudgetCount > 0) {
    return {
      description: "Deterministic status from current dashboard sections",
      detail: `${overBudgetCount} budget ${overBudgetCount === 1 ? "row is" : "rows are"} over the recorded limit.`,
      icon: ClipboardListIcon,
      status: "over_budget" as const,
      title: "Budget attention needed",
    };
  }

  if (commitmentsCount > 0) {
    return {
      description: "Deterministic status from due recurring reminders",
      detail: `${commitmentsCount} recurring ${commitmentsCount === 1 ? "reminder is" : "reminders are"} due.`,
      icon: CalendarClockIcon,
      status: "pending" as const,
      title: "Commitments waiting",
    };
  }

  const completedSavingsCount = savingsGoals.filter(
    (goal) => goal.status === "completed",
  ).length;
  if (completedSavingsCount > 0) {
    return {
      description: "Deterministic status from savings progress",
      detail: `${completedSavingsCount} savings ${completedSavingsCount === 1 ? "goal is" : "goals are"} completed.`,
      icon: PiggyBankIcon,
      status: "completed" as const,
      title: "Savings progress recorded",
    };
  }

  if (!reportLoaded || netCashFlow === 0) {
    return null;
  }

  return netCashFlow > 0
    ? {
        description: "Deterministic status from same-period cash flow",
        detail: "Income is above expenses for the selected period.",
        icon: ShieldCheckIcon,
        status: "on_track" as const,
        title: "Positive cash flow",
      }
    : {
        description: "Deterministic status from same-period cash flow",
        detail: "Expenses are above income for the selected period.",
        icon: ActivityIcon,
        status: "over_budget" as const,
        title: "Cash flow attention needed",
      };
}
