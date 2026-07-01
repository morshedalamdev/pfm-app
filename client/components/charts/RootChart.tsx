"use client";

import { Bar, BarChart, Cell, LabelList, XAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Button } from "../ui/button";
import { Ellipsis } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
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
  data: {
    label: "amount",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

type RootChartProps = {
  buckets: DashboardChartBucket[];
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

  return (
    <>
      <div className="flex items-center justify-between px-3 mb-1.5">
        <h4 className="font-bold capitalize">{type}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onTypeChange("expense")}>
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeChange("income")}>
              Income
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="bg-linear-to-t from-black to-accent rounded-3xl">
        <nav className="w-full flex flex-wrap justify-center pt-1.5">
          <Button
            onClick={() => onPeriodChange("week")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              period === "week" ? "border-white" : "text-input"
            }`}
          >
            Week
          </Button>
          <Button
            onClick={() => onPeriodChange("month")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              period === "month" ? "border-white" : "text-input"
            }`}
          >
            Month
          </Button>
          <Button
            onClick={() => onPeriodChange("year")}
            type="button"
            variant="ghost"
            className={`w-fit rounded-none font-bold h-5 border-b-2 border-transparent transform-fill duration-300 ${
              period === "year" ? "border-white" : "text-input"
            }`}
          >
            Year
          </Button>
        </nav>
        {isLoading ? (
          <div className="p-3">
            <Skeleton className="h-[220px] w-full rounded-2xl bg-white/10" />
          </div>
        ) : errorMessage ? (
          <div className="grid min-h-[220px] place-items-center gap-2 px-8 text-center">
            <p className="text-sm font-semibold">{errorMessage}</p>
            <Button
              type="button"
              variant="reverse"
              className="w-fit"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="relative">
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={buckets}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Bar dataKey="amount" radius={[9, 9, 0, 0]} barSize={barSize}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(value: number) => formatCompactCurrency(value)}
                    className="fill-white text-xs font-bold"
                  />
                  {buckets.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.isCurrent
                          ? "oklch(0.5847 0.2262 26.59)"
                          : "oklch(0.2178 0 129.63)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {!hasActivity && (
              <p className="absolute inset-x-0 bottom-9 text-center text-xs font-semibold text-input">
                No activity for this period
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}
