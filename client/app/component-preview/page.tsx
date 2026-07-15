import { Landmark, PiggyBank, WalletCards } from "lucide-react";
import { notFound } from "next/navigation";

import {
  CardSurface,
  ChangeBadge,
  ChangeIndicator,
  CircularProgress,
  IconContainer,
  LinearProgress,
  MoneyValue,
  PercentageValue,
  ProgressLegend,
  SectionHeader,
  StatusBadge,
} from "@/components/finance";

export const dynamic = "force-dynamic";

export default function ComponentPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-svh bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto grid max-w-5xl gap-5">
        <SectionHeader
          description="Shared finance primitives preview for focused visual and accessibility checks."
          eyebrow="Agent 03"
          title="Component primitives"
        />

        <section className="grid gap-4 md:grid-cols-3" data-testid="surfaces">
          <CardSurface>
            <div className="flex min-w-0 items-start gap-3">
              <IconContainer icon={WalletCards} tone="primary" />
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">
                  Long labelled account with overflow protection
                </p>
                <MoneyValue size="xl" value={1234567890.12} />
              </div>
            </div>
          </CardSurface>

          <CardSurface selected variant="subtle">
            <div className="space-y-2">
              <StatusBadge status="on_track" />
              <MoneyValue
                aria-label="Negative expense value"
                tone="auto"
                value={-321.98}
              />
              <ChangeIndicator label="Down 12 percent" value={-12} />
            </div>
          </CardSurface>

          <CardSurface asChild interactive>
            <button data-testid="interactive-card" type="button">
              <div className="flex items-center gap-3 text-left">
                <IconContainer icon={Landmark} tone="income" />
                <div>
                  <p className="text-sm font-semibold">Focusable surface</p>
                  <p className="text-xs text-muted-foreground">
                    Keyboard ring belongs to the button.
                  </p>
                </div>
              </div>
            </button>
          </CardSurface>
        </section>

        <section
          className="grid gap-4 md:grid-cols-2"
          data-testid="value-states"
        >
          <CardSurface className="space-y-3">
            <SectionHeader title="Values" />
            <div className="grid gap-2 text-sm">
              <MoneyValue compact currency="CNY" value={9876543.21} />
              <MoneyValue signDisplay="always" tone="auto" value={450} />
              <MoneyValue signDisplay="never" tone="neutral" value={-450} />
              <PercentageValue signDisplay="exceptZero" tone="auto" value={0} />
              <PercentageValue signDisplay="exceptZero" tone="auto" value={125} />
              <ChangeBadge label="Income increased 18 percent" value={18} />
            </div>
          </CardSurface>

          <CardSurface className="space-y-3">
            <SectionHeader title="Status" />
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="near_limit" />
              <StatusBadge status="over_budget" />
              <StatusBadge status="disabled" />
              <StatusBadge label="Custom label with longer copy" status="pending" />
            </div>
          </CardSurface>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_auto]" data-testid="progress">
          <CardSurface className="space-y-4">
            <SectionHeader
              description="Visual bars clamp safely while text and aria-valuetext keep true values."
              title="Progress"
            />
            <LinearProgress
              aria-label="Zero target savings progress"
              label="Zero target"
              showValue
              tone="muted"
              value={0}
              valueLabel="0 percent, target is zero"
            />
            <LinearProgress
              aria-label="Over budget progress"
              label="Over 100 percent"
              showValue
              tone="warning"
              value={128}
              valueLabel="128 percent"
            />
            <LinearProgress
              aria-label="Disabled progress"
              disabled
              label="Disabled"
              showValue
              value={42}
            />
            <ProgressLegend
              items={[
                { label: "Used", tone: "expense", value: "72%" },
                { label: "Remaining", tone: "saving", value: "28%" },
              ]}
            />
          </CardSurface>

          <CardSurface className="grid place-items-center">
            <CircularProgress
              aria-label="Savings circle progress"
              label="Savings"
              tone="saving"
              value={100}
            />
          </CardSurface>
        </section>

        <CardSurface className="flex items-center gap-3">
          <IconContainer icon={PiggyBank} tone="saving" />
          <p className="break-words text-sm text-muted-foreground">
            This route is development-only and returns 404 in production.
          </p>
        </CardSurface>
      </div>
    </main>
  );
}
