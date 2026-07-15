import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  type FinanceSize,
  type FinanceTone,
  toneSoftClasses,
} from "./tokens";

type CardSurfaceVariant = "default" | "subtle" | "elevated" | "outline";

const cardSurfaceVariants: Record<CardSurfaceVariant, string> = {
  default: "border-border bg-card text-card-foreground shadow-sm",
  subtle: "border-border bg-surface-subtle text-foreground",
  elevated: "border-border bg-surface-elevated text-foreground shadow-md",
  outline: "border-border bg-transparent text-foreground",
};

export function CardSurface({
  asChild = false,
  className,
  disabled = false,
  interactive = false,
  selected = false,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  selected?: boolean;
  variant?: CardSurfaceVariant;
}) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="card-surface"
      data-disabled={disabled || undefined}
      data-selected={selected || undefined}
      className={cn(
        "rounded-md border p-4 transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "motion-reduce:transition-none",
        cardSurfaceVariants[variant],
        selected && "border-primary-border ring-1 ring-primary-border",
        interactive &&
          "cursor-pointer hover:bg-accent/60 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        disabled && "pointer-events-none opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeader({
  action,
  className,
  description,
  eyebrow,
  title,
}: React.HTMLAttributes<HTMLDivElement> & {
  action?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="break-words text-lg font-semibold leading-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl break-words text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const iconSizes: Record<FinanceSize, string> = {
  sm: "size-7 [&_svg]:size-3.5",
  md: "size-9 [&_svg]:size-4",
  lg: "size-11 [&_svg]:size-5",
};

export function IconContainer({
  "aria-label": ariaLabel,
  className,
  icon: Icon,
  size = "md",
  tone = "primary",
}: React.HTMLAttributes<HTMLSpanElement> & {
  icon: LucideIcon;
  size?: FinanceSize;
  tone?: FinanceTone;
}) {
  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      data-slot="icon-container"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border",
        toneSoftClasses[tone],
        iconSizes[size],
        className,
      )}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}
