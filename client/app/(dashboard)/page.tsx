"use client";

import { Fragment } from "react";
import HeaderItem from "@/components/items/HeaderItem";
import { RootChart } from "@/components/charts/RootChart";
import TransactionItem from "@/components/items/TransactionItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/lib/dashboard/useDashboardData";
import { formatMoney } from "@/lib/finance/format";

export default function HomePage() {
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

  return (
    <Fragment>
      <section className="text-center mt-9 mb-3">
        <h2 className="text-input font-bold uppercase tracking-wide">
          available balance
        </h2>
        {reportLoading ? (
          <Skeleton className="mx-auto mt-2 h-12 w-56" />
        ) : (
          <h3 className="text-5xl font-bold">
            {formatMoney(report?.available_balance ?? "0", reportCurrency)}
          </h3>
        )}
      </section>
      <section className="grid grid-cols-2 gap-3 p-3">
        {reportLoading ? (
          <>
            <Skeleton className="h-[72px] rounded-md" />
            <Skeleton className="h-[72px] rounded-md" />
          </>
        ) : (
          <>
            <HeaderItem
              title="Income"
              amount={formatMoney(report?.income_amount ?? "0", reportCurrency)}
            />
            <HeaderItem
              title="Expense"
              amount={formatMoney(report?.expense_amount ?? "0", reportCurrency)}
            />
          </>
        )}
      </section>
      {reportError && !report && (
        <section className="px-3 pb-3">
          <div className="rounded-md bg-accent p-3 text-center">
            <p className="text-sm font-semibold">{reportError}</p>
            <Button
              type="button"
              variant="reverse"
              className="mt-2 w-fit"
              onClick={loadReport}
            >
              Retry
            </Button>
          </div>
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
