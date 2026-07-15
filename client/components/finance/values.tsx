import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatMoney, formatPercent } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

import {
  type FinanceSize,
  type FinanceTone,
  toneFromSignedValue,
  toneSoftClasses,
  toneTextClasses,
} from "./tokens";

type SignDisplay = "auto" | "always" | "exceptZero" | "never";
type ValueTone = FinanceTone | "auto";

const valueSizes: Record<FinanceSize | "xl", string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

function finiteNumber(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function applySignDisplay(
  formatted: string,
  numeric: number,
  signDisplay: SignDisplay,
) {
  if (signDisplay === "never") return formatted.replace(/^-/, "");
  if (numeric <= 0) return formatted;
  if (signDisplay === "always" || signDisplay === "exceptZero") {
    return `+${formatted}`;
  }
  return formatted;
}

function resolveTone(value: number, tone: ValueTone): FinanceTone {
  return tone === "auto" ? toneFromSignedValue(value) : tone;
}

function formatCompactMoney(value: number, currency: string) {
  const formatted = new Intl.NumberFormat("en-US", {
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
  }).format(value);
  return currency === "CNY" ? formatted.replace(/^CN¥/, "¥") : formatted;
}

export function MoneyValue({
  "aria-label": ariaLabel,
  className,
  compact = false,
  currency = "USD",
  signDisplay = "auto",
  size = "md",
  tone = "neutral",
  value,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  compact?: boolean;
  currency?: string;
  signDisplay?: SignDisplay;
  size?: FinanceSize | "xl";
  tone?: ValueTone;
  value: number | string;
}) {
  const numeric = finiteNumber(value);
  const formatted = compact
    ? formatCompactMoney(numeric, currency)
    : formatMoney(numeric, currency);
  const displayValue = applySignDisplay(formatted, numeric, signDisplay);
  const resolvedTone = resolveTone(numeric, tone);

  return (
    <span
      aria-label={ariaLabel}
      data-slot="money-value"
      className={cn(
        "finance-number inline-block max-w-full whitespace-nowrap break-normal font-semibold",
        valueSizes[size],
        toneTextClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {displayValue}
    </span>
  );
}

export function PercentageValue({
  "aria-label": ariaLabel,
  className,
  signDisplay = "auto",
  size = "md",
  tone = "neutral",
  value,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  signDisplay?: SignDisplay;
  size?: FinanceSize | "xl";
  tone?: ValueTone;
  value: number | string;
}) {
  const numeric = finiteNumber(value);
  const formatted = formatPercent(numeric);
  const displayValue = applySignDisplay(formatted, numeric, signDisplay);
  const resolvedTone = resolveTone(numeric, tone);

  return (
    <span
      aria-label={ariaLabel}
      data-slot="percentage-value"
      className={cn(
        "finance-number inline-block max-w-full whitespace-nowrap font-semibold",
        valueSizes[size],
        toneTextClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {displayValue}
    </span>
  );
}

export function ChangeIndicator({
  className,
  currency = "USD",
  kind = "percent",
  label,
  value,
}: {
  className?: string;
  currency?: string;
  kind?: "currency" | "number" | "percent";
  label?: string;
  value: number | string;
}) {
  const numeric = finiteNumber(value);
  const tone = toneFromSignedValue(numeric);
  const Icon = numeric > 0 ? ArrowUpRight : numeric < 0 ? ArrowDownRight : Minus;
  const formatted =
    kind === "currency"
      ? applySignDisplay(formatMoney(numeric, currency), numeric, "exceptZero")
      : kind === "percent"
        ? applySignDisplay(formatPercent(numeric), numeric, "exceptZero")
        : applySignDisplay(String(Math.round(numeric)), numeric, "exceptZero");

  return (
    <span
      aria-label={label}
      data-slot="change-indicator"
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-sm font-semibold",
        toneTextClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="finance-number truncate">{formatted}</span>
    </span>
  );
}

export function ChangeBadge({
  className,
  currency = "USD",
  kind = "percent",
  label,
  value,
}: {
  className?: string;
  currency?: string;
  kind?: "currency" | "number" | "percent";
  label?: string;
  value: number | string;
}) {
  const numeric = finiteNumber(value);
  const tone = toneFromSignedValue(numeric);

  return (
    <span
      data-slot="change-badge"
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5",
        toneSoftClasses[tone],
        className,
      )}
    >
      <ChangeIndicator
        currency={currency}
        kind={kind}
        label={label}
        value={numeric}
      />
    </span>
  );
}
