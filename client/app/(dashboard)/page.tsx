"use client";

import { Fragment } from "react";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  WalletCardsIcon,
} from "lucide-react";

import { RootChart } from "@/components/charts/RootChart";
import {
  CardSkeleton,
  CardSurface,
  ErrorState,
  FinancialMetricCard,
  MoneyValue,
} from "@/components/finance";
import TransactionItem from "@/components/items/TransactionItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/generated/api-types";
import { useDashboardData } from "@/lib/dashboard/useDashboardData";
import { useHomeBalanceSource } from "@/lib/dashboard/useHomeBalanceSource";
import { formatMoney } from "@/lib/finance/format";
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
    balance,
    error: balanceError,
    isLoading: balanceLoading,
    loadBalanceSources,
  } = useHomeBalanceSource();
  const {
    chartBuckets,
    loadReport,
    loadTransactions,
    period,
    report,
    reportError,
    reportStatus,
    setPeriod,
    setTransactionType,
    transactionType,
    transactions,
    transactionsError,
    transactionsStatus,
  } = useDashboardData();

  const reportLoading = reportStatus === "loading" && !report;
  const transactionsLoading =
    transactionsStatus === "loading" && transactions.length === 0;
  const reportCurrency = report?.currency ?? "USD";
  const netCashFlow = report ? deriveNetCashFlow(report) : 0;

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
      <section className="px-3 pb-[70px]">
        <h2 className="font-bold text-lg pb-3">Recent Transactions</h2>
        {transactionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : transactionsError ? (
          <div className="rounded-md bg-accent p-3 text-center">
            <p className="text-sm font-semibold">{transactionsError}</p>
            <Button
              type="button"
              variant="reverse"
              className="mt-2 w-fit"
              onClick={loadTransactions}
            >
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-md bg-accent p-4 text-center text-sm font-semibold text-input">
            No recent transactions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                type={transaction.type}
                category={transaction.category}
                currency={transaction.currency}
                note={transaction.note}
                amount={transaction.amount}
                date={transaction.date}
                editHref={`/transaction/${transaction.id}`}
                recurringLabel="Not set"
                transactionDate={transaction.transactionDate}
              />
            ))}
          </div>
        )}
      </section>
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
