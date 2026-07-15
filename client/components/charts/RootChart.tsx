"use client";

import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartCard,
  ChartEmptyState,
  ChartHeader,
  ChartTooltipContent,
} from "@/components/finance";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { DashboardChartBucket } from "@/lib/dashboard/useDashboardData";
import type { components } from "@/generated/api-types";

type DashboardPeriod = components["schemas"]["DashboardPeriod"];
type ReportTransactionType = components["schemas"]["ReportTransactionType"];

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

type RootChartProps = {
  buckets: DashboardChartBucket[];
  currency?: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  onPeriodChange: (period: DashboardPeriod) => void;
  onRetry: () => void;
  onTypeChange: (type: ReportTransactionType) => void;
  period: DashboardPeriod;
  type: ReportTransactionType;
};

export function RootChart({
  buckets,
  currency = "USD",
  errorMessage,
  isLoading = false,
  onPeriodChange,
  onRetry,
  onTypeChange,
  period,
  type,
}: RootChartProps) {
  const barSize = period === "week" ? 36 : period === "month" ? 10 : 22;
  const hasActivity = buckets.some((bucket) => bucket.amount > 0);
  const totalAmount = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const peakBucket = buckets.reduce<DashboardChartBucket | null>(
    (peak, bucket) => (!peak || bucket.amount > peak.amount ? bucket : peak),
    null,
  );
  const readableType = type === "income" ? "income" : "expenses";
  const accessibleSummary = hasActivity
    ? `${periodLabel(period)} ${readableType} total ${formatCompactCurrency(
        totalAmount,
        currency,
      )}. Highest bucket: ${peakBucket?.label ?? "none"} at ${formatCompactCurrency(
        peakBucket?.amount ?? 0,
        currency,
      )}.`
    : `No ${readableType} activity is available for ${periodLabel(period).toLowerCase()}.`;

  return (
    <ChartCard
      accessibleSummary={accessibleSummary}
      className="mx-3"
      empty={!hasActivity}
      emptyState={
        <ChartEmptyState
          description={`Switch period or type to review more ${readableType}.`}
          title={`No ${readableType} activity`}
        />
      }
      error={
        errorMessage ? (
          <div className="grid justify-items-center gap-2 text-center">
            <span>{errorMessage}</span>
            <Button className="w-fit" onClick={onRetry} type="button">
              Retry chart
            </Button>
          </div>
        ) : null
      }
      header={
        <ChartHeader
          chartTypeControl={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Change chart type" size="icon-sm" variant="outline">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTypeChange("expense")}>
                  Expense
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTypeChange("income")}>
                  Income
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
          periodControl={
            <ChartPeriodControl onChange={onPeriodChange} value={period} />
          }
          subtitle={accessibleSummary}
          title={`${periodLabel(period)} ${readableType}`}
        />
      }
      loading={isLoading}
    >
      <ChartContainer
        className="[&_.recharts-cartesian-axis-tick_text]:fill-chart-axis"
        config={chartConfig}
      >
        <BarChart accessibilityLayer data={buckets}>
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  formatCompactCurrency(Number(value), currency)
                }
                hideLabel={false}
                indicator="dot"
              />
            }
            cursor={{ fill: "var(--color-chart-track)" }}
          />
          <Bar dataKey="amount" name="Amount" radius={[8, 8, 0, 0]} barSize={barSize}>
            <LabelList
              className="fill-chart-axis text-xs font-semibold"
              dataKey="amount"
              formatter={(value: number) =>
                formatCompactCurrency(value, currency)
              }
              position="top"
            />
            {buckets.map((entry, index) => (
              <Cell
                fill={
                  entry.isCurrent
                    ? "var(--color-chart-1)"
                    : "var(--color-chart-muted)"
                }
                key={`cell-${index}`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function ChartPeriodControl({
  onChange,
  value,
}: {
  onChange: (period: DashboardPeriod) => void;
  value: DashboardPeriod;
}) {
  return (
    <div
      aria-label="Chart period"
      className="inline-flex rounded-md border border-border bg-background p-1"
      role="group"
    >
      {(["week", "month", "year"] as DashboardPeriod[]).map((periodOption) => (
        <Button
          aria-pressed={value === periodOption}
          className="h-8 px-3 text-xs"
          key={periodOption}
          onClick={() => onChange(periodOption)}
          type="button"
          variant={value === periodOption ? "default" : "ghost"}
        >
          {periodLabel(periodOption)}
        </Button>
      ))}
    </div>
  );
}

function formatCompactCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    currency,
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function periodLabel(period: DashboardPeriod) {
  return period === "week" ? "Week" : period === "month" ? "Month" : "Year";
}
