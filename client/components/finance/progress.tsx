import * as React from "react";

import { cn } from "@/lib/utils";

import {
  type FinanceSize,
  type FinanceTone,
  toneFillClasses,
  toneSoftClasses,
  toneTextClasses,
} from "./tokens";
import { PercentageValue } from "./values";

function finiteNumber(value: number | string | undefined): number {
  const numeric =
    typeof value === "number" ? value : value === undefined ? 0 : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

const linearHeights: Record<FinanceSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const toneStrokeClasses: Record<FinanceTone, string> = {
  neutral: "stroke-foreground",
  primary: "stroke-primary",
  income: "stroke-income",
  expense: "stroke-expense",
  saving: "stroke-saving",
  debt: "stroke-debt",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  info: "stroke-info",
  muted: "stroke-muted-foreground",
};

export function LinearProgress({
  "aria-label": ariaLabel,
  className,
  disabled = false,
  label,
  showValue = false,
  size = "md",
  tone = "primary",
  value,
  valueLabel,
}: {
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  label?: React.ReactNode;
  showValue?: boolean;
  size?: FinanceSize;
  tone?: FinanceTone;
  value: number | string;
  valueLabel?: string;
}) {
  const numeric = finiteNumber(value);
  const clamped = clampPercent(numeric);
  const accessibleLabel = ariaLabel ?? valueLabel ?? `${Math.round(numeric)}%`;

  return (
    <div data-slot="linear-progress" className={cn("space-y-2", className)}>
      {(label || showValue) && (
        <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
          {label ? (
            <span className="min-w-0 truncate text-muted-foreground">
              {label}
            </span>
          ) : null}
          {showValue ? (
            <PercentageValue
              aria-label={accessibleLabel}
              className="shrink-0"
              size="sm"
              tone={numeric > 100 ? "warning" : "neutral"}
              value={numeric}
            />
          ) : null}
        </div>
      )}
      <div
        aria-label={accessibleLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuetext={valueLabel ?? `${Math.round(numeric)}%`}
        data-disabled={disabled || undefined}
        role="progressbar"
        className={cn(
          "w-full overflow-hidden rounded-full bg-chart-track",
          linearHeights[size],
          disabled && "opacity-55",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
            toneFillClasses[disabled ? "muted" : tone],
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function CircularProgress({
  "aria-label": ariaLabel,
  className,
  label,
  showValue = true,
  size = 88,
  strokeWidth = 8,
  tone = "primary",
  value,
  valueLabel,
}: {
  "aria-label"?: string;
  className?: string;
  label?: React.ReactNode;
  showValue?: boolean;
  size?: number;
  strokeWidth?: number;
  tone?: FinanceTone;
  value: number | string;
  valueLabel?: string;
}) {
  const numeric = finiteNumber(value);
  const clamped = clampPercent(numeric);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const accessibleLabel = ariaLabel ?? valueLabel ?? `${Math.round(numeric)}%`;

  return (
    <div
      data-slot="circular-progress"
      className={cn("inline-flex flex-col items-center gap-2", className)}
    >
      <div
        aria-label={accessibleLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuetext={valueLabel ?? `${Math.round(numeric)}%`}
        className="relative inline-grid place-items-center"
        role="progressbar"
        style={{ height: size, width: size }}
      >
        <svg aria-hidden="true" className="size-full -rotate-90">
          <circle
            className="stroke-chart-track"
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className={cn(
              "transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none",
              toneStrokeClasses[tone],
            )}
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        </svg>
        {showValue ? (
          <PercentageValue
            className="absolute text-center"
            size="sm"
            tone={numeric > 100 ? "warning" : "neutral"}
            value={numeric}
          />
        ) : null}
      </div>
      {label ? (
        <span className="max-w-32 break-words text-center text-xs text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function ProgressLegend({
  className,
  items,
}: {
  className?: string;
  items: Array<{
    label: React.ReactNode;
    tone?: FinanceTone;
    value?: React.ReactNode;
  }>;
}) {
  return (
    <ul
      data-slot="progress-legend"
      className={cn("grid gap-2 text-sm sm:grid-cols-2", className)}
    >
      {items.map((item, index) => (
        <li
          className="flex min-w-0 items-center justify-between gap-3"
          key={index}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-2.5 shrink-0 rounded-full border",
                toneSoftClasses[item.tone ?? "primary"],
              )}
            />
            <span className="truncate text-muted-foreground">{item.label}</span>
          </span>
          {item.value ? (
            <span className="finance-number shrink-0 font-semibold text-foreground">
              {item.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
