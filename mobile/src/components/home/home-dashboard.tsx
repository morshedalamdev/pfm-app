"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, CircleArrowDown, CircleArrowUp, Coffee, ShoppingBag, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { InsightBanner } from "@/components/finance/insight-banner";
import { MoneyStatCard } from "@/components/finance/money-stat-card";
import { TransactionRow } from "@/components/finance/transaction-row";
import { HomeHeader } from "@/components/layout/home-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getHomeData } from "@/lib/home/api";
import {
  formatMoney,
  formatMonthLabel,
  formatSignedMoney,
  mapTransaction,
} from "@/lib/home/view-model";

function HomeSheetSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading home overview" className="home-sheet">
      <div className="section-heading"><div><p className="eyebrow">OVERVIEW</p><h2>Your Money</h2></div></div>
      <div className="money-grid"><div className="money-card skeleton-card" /><div className="money-card skeleton-card" /></div>
      <div className="skeleton-banner" />
      <section className="transaction-section"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Transactions</h2></div></div><div className="stack-list"><div className="transaction-row skeleton-row" /><div className="transaction-row skeleton-row" /></div></section>
    </section>
  );
}

function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="home-sheet">
      <div className="home-status-card" role="alert">
        <CircleArrowUp aria-hidden="true" size={24} />
        <div><h2>Couldn’t load your overview</h2><p>Check your connection and try again.</p></div>
        <button className="retry-button" onClick={onRetry} type="button">Try again</button>
      </div>
    </section>
  );
}

export function HomeDashboard() {
  const home = useQuery({
    queryFn: getHomeData,
    queryKey: ["home", "month"],
  });
  const dashboard = home.data?.dashboard;
  const transactions = home.data?.transactions.items ?? [];

  return (
    <MobileShell>
      <h1 className="sr-only">Home overview</h1>
      <HomeHeader
        balance={dashboard ? formatMoney(dashboard.available_balance, dashboard.currency) : undefined}
        change={dashboard ? `${formatSignedMoney(dashboard.net_flow_amount, dashboard.currency)} net flow this month` : undefined}
        monthLabel={dashboard ? formatMonthLabel(dashboard.range.start_at) : "This month"}
        actions={<><ThemeToggle compact /><button aria-label="Notifications" className="icon-button" type="button"><Bell aria-hidden="true" size={19} strokeWidth={2.3} /><span className="notification-dot" /></button></>}
      />

      {home.isPending ? <HomeSheetSkeleton /> : null}
      {home.isError ? <HomeError onRetry={() => void home.refetch()} /> : null}
      {dashboard && !home.isError ? (
        <section className="home-sheet">
          <div className="section-heading">
            <div><p className="eyebrow">OVERVIEW</p><h2>Your Money</h2></div>
            <Link className="soft-button" href="/report">Details <span aria-hidden="true">›</span></Link>
          </div>

          <div className="money-grid">
            <MoneyStatCard accent="blue" icon={CircleArrowDown} label="Income" value={formatMoney(dashboard.income_amount, dashboard.currency)} />
            <MoneyStatCard accent="coral" icon={ShoppingBag} label="Expenses" value={formatMoney(dashboard.expense_amount, dashboard.currency)} />
          </div>

          <InsightBanner message={`${formatSignedMoney(dashboard.net_flow_amount, dashboard.currency)} net flow in ${formatMonthLabel(dashboard.range.start_at)}`} />

          <section aria-labelledby="transactions-heading" className="transaction-section">
            <div className="section-heading section-heading--compact">
              <div><p className="eyebrow">RECENT ACTIVITY</p><h2 id="transactions-heading">Transactions</h2></div>
              <span className="period-pill">This month</span>
            </div>

            {transactions.length ? (
              <div className="stack-list transaction-list">
                {transactions.map((transaction) => {
                  const view = mapTransaction(transaction);
                  const Icon = view.accent === "blue" ? CircleArrowDown : view.accent === "purple" ? WalletCards : Coffee;
                  const href = transaction.type === "income" || transaction.type === "expense" ? `/transactions/${transaction.id}/edit` as Route : undefined;
                  return <TransactionRow key={transaction.id} accent={view.accent} amount={view.amount} href={href} icon={Icon} name={view.name} negative={view.isNegative} subtitle={`${view.subtitle} · ${view.dateLabel}`} />;
                })}
              </div>
            ) : (
              <div className="empty-transactions"><WalletCards aria-hidden="true" size={22} /><div><strong>No transactions this month</strong><span>New activity will appear here.</span></div></div>
            )}
          </section>
        </section>
      ) : null}
    </MobileShell>
  );
}
