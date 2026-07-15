"use client";

import * as React from "react";

import {
  ChartTooltipContent as BaseChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { CardSurface, SectionHeader } from "./layout";
import { type FinanceTone, toneSoftClasses } from "./tokens";

export type ChartLegendItem = {
  label: React.ReactNode;
  tone?: FinanceTone;
  value?: React.ReactNode;
};

export function ChartCard({
  accessibleSummary,
  children,
  className,
  error,
  height = "md",
  loading = false,
  empty = false,
  emptyState,
  loadingState,
  header,
}: {
  accessibleSummary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
  emptyState?: React.ReactNode;
  error?: React.ReactNode;
  header?: React.ReactNode;
  height?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingState?: React.ReactNode;
}) {
  const heightClass =
    height === "sm" ? "min-h-48" : height === "lg" ? "min-h-96" : "min-h-72";

  return (
    <CardSurface className={cn("space-y-4", className)} data-slot="chart-card">
      {header}
      {accessibleSummary ? (
        <p className="sr-only" data-slot="chart-accessible-summary">
          {accessibleSummary}
        </p>
      ) : null}
      <div
        className={cn(
          "relative grid place-items-center rounded-md border border-border bg-surface-subtle p-3",
          heightClass,
        )}
      >
        {loading ? loadingState ?? <ChartLoadingState /> : null}
        {!loading && error ? (
          <div className="text-sm font-semibold text-destructive">{error}</div>
        ) : null}
        {!loading && !error && empty ? emptyState ?? <ChartEmptyState /> : null}
        {!loading && !error && !empty ? (
          <div className="size-full min-h-0 min-w-0">{children}</div>
        ) : null}
      </div>
    </CardSurface>
  );
}

export function ChartHeader({
  chartTypeControl,
  className,
  periodControl,
  subtitle,
  title,
}: {
  chartTypeControl?: React.ReactNode;
  className?: string;
  periodControl?: React.ReactNode;
  subtitle?: React.ReactNode;
  title: React.ReactNode;
}) {
  const action =
    periodControl || chartTypeControl ? (
      <div className="flex flex-wrap items-center gap-2">
        {periodControl}
        {chartTypeControl}
      </div>
    ) : null;

  return (
    <SectionHeader
      action={action}
      className={className}
      description={subtitle}
      title={title}
    />
  );
}

export function ChartLegend({
  className,
  items,
}: {
  className?: string;
  items: ChartLegendItem[];
}) {
  return (
    <ul className={cn("flex flex-wrap gap-3 text-xs", className)} data-slot="chart-legend">
      {items.map((item, index) => (
        <li className="flex min-w-0 items-center gap-1.5" key={index}>
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full border",
              toneSoftClasses[item.tone ?? "primary"],
            )}
          />
          <span className="truncate text-muted-foreground">{item.label}</span>
          {item.value ? (
            <span className="finance-number font-semibold text-foreground">
              {item.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ChartLoadingState({
  label = "Loading chart",
}: {
  label?: React.ReactNode;
}) {
  return (
    <div className="grid w-full gap-3" data-slot="chart-loading-state">
      <p className="sr-only">{label}</p>
      <div className="h-4 w-1/3 rounded-md bg-muted" />
      <div className="grid h-40 grid-cols-6 items-end gap-2">
        {[35, 62, 48, 80, 54, 70].map((height, index) => (
          <div
            aria-hidden="true"
            className="rounded-t-md bg-muted"
            key={index}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChartEmptyState({
  description = "No chart data is available for this view.",
  title = "No data",
}: {
  description?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div className="max-w-sm text-center" data-slot="chart-empty-state">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ChartTooltipContent(
  props: React.ComponentProps<typeof BaseChartTooltipContent>,
) {
  return <BaseChartTooltipContent {...props} />;
}

export type { ChartConfig };
