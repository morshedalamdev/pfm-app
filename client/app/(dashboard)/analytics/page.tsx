"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  CalendarDaysIcon,
  ChartNoAxesGanttIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CoinsIcon,
  TargetIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import HeaderItem from "@/components/items/HeaderItem";
import { Progress } from "@/components/ui/progress";
import IncomeVsExpenseChart, {
  type IncomeVsExpensePoint,
} from "@/components/charts/IncomeVsExpenseChart";
import SpendingChart, {
  type SpendingChartItem,
} from "@/components/charts/SpendingChart";
import {
  getCashFlowReport,
  getMonthlySummary,
  getSpendingByCategoryReport,
  type CashFlowReport,
  type MonthlySummary,
  type SpendingByCategoryReport,
} from "@/lib/analytics/api";
import {
  formatMoney,
  formatPercent,
  monthDateTimeBounds,
  monthKey,
} from "@/lib/finance/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 18 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      label: date.toLocaleDateString([], { month: "short", year: "numeric" }),
      value: monthKey(date),
    };
  });
}

function displayReportDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

export default function AnalyticsPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(monthKey());
  const [open, setOpen] = useState(false);
  const [spending, setSpending] = useState<SpendingByCategoryReport | null>(
    null,
  );
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const months = useMemo(monthOptions, []);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const bounds = monthDateTimeBounds(month);
      const [nextSummary, nextCashFlow, nextSpending] = await Promise.all([
        getMonthlySummary(month),
        getCashFlowReport({
          dateFrom: bounds.start,
          dateTo: bounds.end,
          interval: "day",
        }),
        getSpendingByCategoryReport({
          dateFrom: bounds.start,
          dateTo: bounds.end,
        }),
      ]);
      setSummary(nextSummary);
      setCashFlow(nextCashFlow);
      setSpending(nextSpending);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Analytics data could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const activeMonthLabel =
    months.find((option) => option.value === month)?.label ?? month;

  const cashFlowData: IncomeVsExpensePoint[] = useMemo(
    () =>
      cashFlow?.buckets.map((bucket) => ({
        expense: Number(bucket.expense_amount),
        income: Number(bucket.income_amount),
        label: new Date(bucket.start_at).toLocaleDateString([], {
          day: "numeric",
        }),
      })) ?? [],
    [cashFlow],
  );

  const spendingData: SpendingChartItem[] = useMemo(
    () =>
      spending?.items.map((item, index) => ({
        fill: CHART_COLORS[index % CHART_COLORS.length],
        name: item.category_name,
        value: Number(item.amount),
      })) ?? [],
    [spending],
  );

  const savingsTrend = Number(summary?.savings_month_over_month_percent ?? 0);
  const hasCashFlowData = cashFlowData.some(
    (point) => point.income > 0 || point.expense > 0,
  );
  const hasSpendingData = spendingData.some((item) => item.value > 0);

  return (
    <Fragment>
      <Header title="Analytics">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={open}
              className="w-25 justify-between"
            >
              {activeMonthLabel}
              <ChevronDownIcon className="text-input" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-30 p-0">
            <Command>
              <CommandInput placeholder="Search Month" />
              <CommandGroup>
                {months.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    className="flex items-center justify-between"
                    onSelect={(currentValue) => {
                      setMonth(currentValue);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <CheckIcon
                      className={
                        month === option.value ? "opacity-100" : "opacity-0"
                      }
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </Header>
      <div className="h-[calc(100%-44px)] pb-[70px] overflow-y-auto">
        {isLoading && (
          <section className="mt-6 px-3">
            <p className="text-input text-sm">Loading analytics...</p>
          </section>
        )}
        {error && (
          <section className="mt-6 px-3 space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadReports()}>
              Retry
            </Button>
          </section>
        )}
        {!isLoading && !error && summary && (
          <Fragment>
            <section className="mt-6 px-3">
              <h2 className="text-input font-bold uppercase tracking-wide">
                Savings
              </h2>
              <h3 className="text-5xl font-bold">
                {formatMoney(summary.savings_amount, summary.currency)}
              </h3>
              <h4 className="font-medium mt-1.5">
                <span
                  className={savingsTrend >= 0 ? "text-green-400" : "text-red-400"}
                >
                  {savingsTrend >= 0 ? "+" : ""}
                  {formatPercent(savingsTrend)}
                </span>{" "}
                from last month
              </h4>
            </section>
            <section className="grid grid-cols-2 gap-3 p-3 pb-0">
              <HeaderItem
                title="Income"
                amount={formatMoney(summary.income_amount, summary.currency)}
              />
              <HeaderItem
                title="Expenses"
                amount={formatMoney(summary.expense_amount, summary.currency)}
              />
            </section>
            <section className="grid grid-cols-2 gap-3 p-3">
              <Link href="/savings">
                <div className="rounded-md p-3 flex flex-col border border-input">
                  <div className="flex justify-between items-center mb-1.5">
                    <TargetIcon />
                    <ChevronRightIcon />
                  </div>
                  <h2 className="font-bold text-base">Savings Goals</h2>
                  <p className="text-xs">
                    {summary.active_savings_goal_count} active goals
                  </p>
                </div>
              </Link>
              <Link href="/budget">
                <div className="rounded-md p-3 flex flex-col border border-input">
                  <div className="flex justify-between items-center mb-1.5">
                    <ClipboardListIcon />
                    <ChevronRightIcon />
                  </div>
                  <h2 className="font-bold text-base">Budget Planning</h2>
                  <p className="text-xs">
                    {summary.budget_used_percent
                      ? `${formatPercent(summary.budget_used_percent)} used`
                      : "No active budget"}
                  </p>
                </div>
              </Link>
            </section>
            <section className="p-3 space-y-1.5">
              <h2 className="font-bold text-lg">Income vs Expense</h2>
              {hasCashFlowData ? (
                <IncomeVsExpenseChart data={cashFlowData} />
              ) : (
                <p className="text-input text-sm">No cash flow for this month.</p>
              )}
            </section>
            <section className="p-3 space-y-1.5">
              <h2 className="font-bold text-lg">Spending by Category</h2>
              {hasSpendingData ? (
                <SpendingChart data={spendingData} />
              ) : (
                <p className="text-input text-sm">
                  No category spending for this month.
                </p>
              )}
            </section>
            <section className="p-3 space-y-1.5">
              <h2 className="font-bold text-lg">Top Expenses</h2>
              {summary.top_expenses.length === 0 ? (
                <p className="text-input text-sm">No top expenses found.</p>
              ) : (
                <ul className="space-y-3">
                  {summary.top_expenses.map((expense) => (
                    <li
                      className="border border-input rounded-md p-1.5"
                      key={expense.category_id ?? expense.category_name}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="secondary" size="icon">
                          <CoinsIcon />
                        </Button>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="flex justify-between gap-3">
                            <h3 className="flex-1 font-bold text-base line-clamp-1">
                              {expense.category_name}
                            </h3>
                            <h4 className="font-bold text-base">
                              {formatMoney(expense.amount, summary.currency)}
                            </h4>
                          </div>
                          <div className="flex flex-wrap justify-between text-input gap-0.5">
                            <p>
                              {expense.budget_percent_used
                                ? `${formatPercent(expense.budget_percent_used)} of budget`
                                : `${expense.transaction_count} transactions`}
                            </p>
                            {expense.budget_limit_amount && (
                              <h6>
                                Budget:{" "}
                                {formatMoney(
                                  expense.budget_limit_amount,
                                  summary.currency,
                                )}
                              </h6>
                            )}
                            <Progress
                              value={Math.min(
                                Number(expense.budget_percent_used ?? 0),
                                100,
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="p-3 space-y-1.5">
              <h2 className="font-bold text-lg">Monthly Trends</h2>
              <ul className="space-y-3">
                <li className="border border-input rounded-md p-1.5">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1">
                      <h3 className="text-input">Average Daily Spending</h3>
                      <h4 className="font-bold text-base">
                        {formatMoney(
                          summary.trends.average_daily_spending,
                          summary.currency,
                        )}
                      </h4>
                    </div>
                    <ChartNoAxesGanttIcon />
                  </div>
                </li>
                <li className="border border-input rounded-md p-1.5">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1">
                      <h3 className="text-input">Most Expensive Day</h3>
                      <h4 className="font-bold text-base">
                        {summary.trends.most_expensive_day
                          ? `${displayReportDate(
                              summary.trends.most_expensive_day.date,
                            )} - ${formatMoney(
                              summary.trends.most_expensive_day.amount,
                              summary.currency,
                            )}`
                          : "No expense day"}
                      </h4>
                    </div>
                    <CalendarDaysIcon />
                  </div>
                </li>
                <li className="border border-input rounded-md p-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1">
                      <h3 className="text-input mb-1.5">Budget Adherence</h3>
                      <Progress
                        value={Math.min(
                          Number(summary.trends.budget_adherence_percent ?? 0),
                          100,
                        )}
                      />
                    </div>
                    <h4 className="font-bold text-lg">
                      {summary.trends.budget_adherence_percent
                        ? formatPercent(
                            summary.trends.budget_adherence_percent,
                          )
                        : "0%"}
                    </h4>
                  </div>
                </li>
              </ul>
            </section>
          </Fragment>
        )}
      </div>
    </Fragment>
  );
}
