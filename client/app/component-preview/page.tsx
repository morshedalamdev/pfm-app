import {
  Coffee,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  AccountCard,
  CardSurface,
  ChartCard,
  ChartEmptyState,
  ChartHeader,
  ChartLegend,
  ChartLoadingState,
  ChangeBadge,
  ChangeIndicator,
  CircularProgress,
  FinancialMetricCard,
  FinancialSummaryCard,
  IconContainer,
  LinearProgress,
  LoanDebtCard,
  MoneyValue,
  PercentageValue,
  ProgressLegend,
  ReportCategoryRow,
  SavingsGoalCard,
  SectionHeader,
  StatusBadge,
  TransactionRow,
  BudgetProgressRow,
  UpcomingCommitmentRow,
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

        <section className="grid gap-4 md:grid-cols-3" data-testid="financial-cards">
          <FinancialMetricCard
            amount={98765.43}
            icon={WalletCards}
            supportingText="This month"
            title="Available balance"
            tone="primary"
            trend={<ChangeIndicator value={8} />}
          />
          <FinancialMetricCard
            amount={-1200}
            compact
            icon={ShoppingBag}
            supportingText="Compact card"
            title="Expense movement"
            tone="expense"
            trend={<ChangeBadge value={-4} />}
          />
          <FinancialSummaryCard
            amount={45000}
            icon={Landmark}
            items={[
              { label: "Income", value: "$7,200" },
              { label: "Expenses", value: "$3,100" },
            ]}
            status={<StatusBadge status="active" />}
            subtitle="Summary subtitle can wrap without clipping."
            title="Financial summary"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2" data-testid="domain-cards">
          <AccountCard
            accountName="Very long primary checking account name"
            accountType="Checking"
            balance={1234567.89}
            currency="USD"
            percentageOfTotal={62}
            recentActivity="Updated today"
            status="default"
            actions={
              <button aria-label="Account actions" className="rounded-md p-1">
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </button>
            }
          />
          <AccountCard
            accountName="Archived savings"
            accountType="Savings"
            balance={0}
            currency="USD"
            disabled
            status="archived"
          />
          <SavingsGoalCard
            currency="USD"
            expectedCompletion="Expected Sep 2026"
            goalName="Emergency fund with a very long goal name"
            progress={72}
            remainingAmount={2800}
            requiredContribution="$400 required"
            savedAmount={7200}
            status="on_track"
            targetAmount={10000}
            targetDate="Target Dec 2026"
          />
          <LoanDebtCard
            account="Main checking"
            currency="USD"
            direction="given"
            originalAmount={5000}
            outstandingAmount={2750}
            person="Taylor Morgan"
            progress={45}
            repayDate="Repay by Oct 15, 2026"
            status="pending"
          />
        </section>

        <section className="grid gap-3" data-testid="financial-rows">
          <TransactionRow
            account="Main checking"
            amount={84.2}
            category="Coffee and bakery with long merchant name"
            categoryIcon={Coffee}
            date="Today"
            description="Morning run"
            tags={["food", "daily"]}
            type="expense"
          />
          <TransactionRow
            account="Payroll"
            amount={4200}
            category="Salary"
            date="Jul 15"
            selected
            type="income"
          />
          <BudgetProgressRow
            category="Groceries and household essentials"
            currency="USD"
            limit={800}
            percentage={118}
            remaining={-144}
            spent={944}
            status="over_budget"
          />
          <ReportCategoryRow
            amount={944}
            category="Groceries"
            currency="USD"
            icon={ShoppingBag}
            percentage={42}
            periodComparison={-6}
            tone="expense"
          />
          <UpcomingCommitmentRow
            amount={120}
            currency="USD"
            date="Tomorrow"
            status="pending"
            title="Recurring utility payment"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3" data-testid="chart-cards">
          <ChartCard
            accessibleSummary="Income is higher than expenses in this preview."
            header={
              <ChartHeader
                chartTypeControl={<StatusBadge label="Line" status="neutral" />}
                periodControl={<StatusBadge label="Month" status="active" />}
                subtitle="Responsive chart container"
                title="Cash flow"
              />
            }
          >
            <div className="grid h-full min-h-48 grid-cols-6 items-end gap-2">
              {[60, 45, 72, 54, 86, 68].map((height, index) => (
                <div
                  aria-hidden="true"
                  className="rounded-t-md bg-primary"
                  key={index}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <ChartLegend
              className="mt-3"
              items={[
                { label: "Income", tone: "income", value: "$7.2k" },
                { label: "Expense", tone: "expense", value: "$3.1k" },
              ]}
            />
          </ChartCard>
          <ChartCard
            header={<ChartHeader title="Loading chart" />}
            loading
            loadingState={<ChartLoadingState />}
          >
            <span />
          </ChartCard>
          <ChartCard
            empty
            emptyState={<ChartEmptyState description="Try a different period." />}
            header={<ChartHeader title="Empty chart" />}
          >
            <span />
          </ChartCard>
        </section>
      </div>
    </main>
  );
}
