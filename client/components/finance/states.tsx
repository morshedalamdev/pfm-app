import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CardSurface } from "./layout";
import { type FinanceTone, toneSoftClasses } from "./tokens";

type StateAction = {
  label: React.ReactNode;
  onClick?: () => void;
};

function StateActions({
  primaryAction,
  secondaryAction,
}: {
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
}) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {secondaryAction ? (
        <Button onClick={secondaryAction.onClick} type="button" variant="outline">
          {secondaryAction.label}
        </Button>
      ) : null}
      {primaryAction ? (
        <Button onClick={primaryAction.onClick} type="button">
          {primaryAction.label}
        </Button>
      ) : null}
    </div>
  );
}

export function PageLoadingState({
  label = "Loading",
}: {
  label?: React.ReactNode;
}) {
  return (
    <div
      aria-busy="true"
      className="grid min-h-64 place-items-center p-6"
      data-slot="page-loading-state"
      role="status"
    >
      <div className="w-full max-w-2xl space-y-4">
        <p className="sr-only">{label}</p>
        <div className="h-5 w-1/3 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <CardSurface
      aria-hidden="true"
      className={cn("space-y-3", className)}
      data-slot="card-skeleton"
    >
      <div className="h-4 w-2/3 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-8 w-1/2 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-3 w-full rounded-md bg-muted motion-safe:animate-pulse" />
    </CardSurface>
  );
}

export function ListSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} data-slot="list-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <div
          aria-hidden="true"
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
          key={index}
        >
          <div className="size-9 rounded-md bg-muted motion-safe:animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-md bg-muted motion-safe:animate-pulse" />
            <div className="h-3 w-1/2 rounded-md bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="h-4 w-14 rounded-md bg-muted motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  className,
  description,
  primaryAction,
  secondaryAction,
  title = "Nothing here yet",
}: {
  className?: string;
  description?: React.ReactNode;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  title?: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-md border border-dashed border-border p-6 text-center", className)}
      data-slot="empty-state"
    >
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <StateActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
    </div>
  );
}

export function ErrorState({
  className,
  description,
  primaryAction,
  retryAction,
  title = "Something went wrong",
}: {
  className?: string;
  description?: React.ReactNode;
  primaryAction?: StateAction;
  retryAction?: StateAction;
  title?: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-md border border-destructive/30 bg-destructive-soft p-6 text-center", className)}
      data-slot="error-state"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mx-auto size-6 text-destructive" />
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <StateActions primaryAction={retryAction ?? primaryAction} />
    </div>
  );
}

export function InlineError({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm font-medium text-destructive", className)}
      role="alert"
      {...props}
    >
      {children}
    </p>
  );
}

function Banner({
  children,
  className,
  role = "status",
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
  tone: FinanceTone;
}) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? TriangleAlert : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm",
        toneSoftClasses[tone],
        className,
      )}
      data-slot="alert-banner"
      role={role}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function AlertBanner(props: Omit<React.ComponentProps<typeof Banner>, "tone">) {
  return <Banner tone="info" {...props} />;
}

export function SuccessBanner(props: Omit<React.ComponentProps<typeof Banner>, "tone">) {
  return <Banner tone="success" {...props} />;
}

export function WarningBanner(props: Omit<React.ComponentProps<typeof Banner>, "tone">) {
  return <Banner role="alert" tone="warning" {...props} />;
}
