"use client";

import Decimal from "decimal.js";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, HandCoins, Landmark, PiggyBank, ReceiptText, Target, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getAccounts } from "@/lib/accounts/api";
import { getReportData } from "@/lib/reports/api";
import { getLoanSummary } from "@/lib/loans/api";
import { cashFlowHeight, currentMonthKey, formatReportPercent, reportMonthLabel, reportPercent } from "@/lib/reports/utils";
import { formatMoney, formatSignedMoney } from "@/lib/home/view-model";

type ReportKind = "expense" | "income" | "budget" | "goal" | "loan" | "account";

const reportKinds = [
  { icon: ReceiptText, label: "Expenses", value: "expense" },
  { icon: CircleDollarSign, label: "Income", value: "income" },
  { icon: WalletCards, label: "Budget", value: "budget" },
  { icon: Target, label: "Goal", value: "goal" },
  { icon: HandCoins, label: "Loan", value: "loan" },
  { icon: Landmark, label: "Account", value: "account" },
] as const satisfies ReadonlyArray<{ icon: typeof ReceiptText; label: string; value: ReportKind }>;

const chartColors = ["var(--blue)", "var(--orange)", "var(--brand)", "var(--coral)", "var(--green)"];

function moveMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, monthNumber! - 1 + offset, 1)).toISOString().slice(0, 7);
}

function Donut({ data }: { data: { amount: string; category_name: string; percent: string }[] }) {
  const donut = data.slice(0, 5).reduce<{ cursor: number; segments: string[] }>((state, item, index) => {
    const end = Math.min(100, state.cursor + reportPercent(item.percent));
    return {
      cursor: end,
      segments: [...state.segments, `${chartColors[index]} ${state.cursor}% ${end}%`],
    };
  }, { cursor: 0, segments: [] });
  const segments = donut.cursor < 100
    ? [...donut.segments, `var(--surface-soft) ${donut.cursor}% 100%`]
    : donut.segments;

  return <div aria-label="Spending by category chart" className="live-donut" role="img" style={{ background: `conic-gradient(${segments.join(",")})` }}><div /></div>;
}

function CashFlowBars({ data }: { data: { amount: string; label: string }[] }) {
  const maximum = data.reduce((highest, item) => {
    try { return Decimal.max(highest, item.amount).toString(); } catch { return highest; }
  }, "0");
  return (
    <div aria-label="Daily cash flow chart" className="cash-flow-bars" role="img">
      {data.map((item) => <div className="cash-flow-bar" key={item.label}><span aria-hidden="true" style={{ height: `${cashFlowHeight(item.amount, maximum)}%` }} /><small>{item.label}</small></div>)}
    </div>
  );
}

function ReportLoading() {
  return <div aria-busy="true" aria-label="Loading report" className="report-loading" role="status"><div /><div /><div /></div>;
}

function AnalyticsLink({ children, href }: { children: ReactNode; href: Route }) {
  return <Link className="analytics-detail-link" href={href}>{children}<ChevronRight aria-hidden="true" size={17} /></Link>;
}

export function ReportDashboard({ title = "Report" }: { title?: string }) {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [kind, setKind] = useState<ReportKind>("expense");
  const report = useQuery({ queryFn: () => getReportData(month), queryKey: ["report", month] });
  const loanSummary = useQuery({ enabled: kind === "loan", queryFn: getLoanSummary, queryKey: ["report", "loan-summary"] });
  const accounts = useQuery({ enabled: kind === "account", queryFn: getAccounts, queryKey: ["report", "accounts"] });
  const isCurrentMonth = month === currentMonthKey();
  const data = report.data;
  const currency = data?.summary.currency ?? "USD";
  const monthlyAmount = kind === "expense" ? data?.spending.total_amount : data?.summary.income_amount;
  const cashFlowKind = kind === "income" ? "income_amount" : "expense_amount";
  const cashFlow = data?.cashFlow.buckets.map((bucket) => ({ amount: bucket[cashFlowKind], label: bucket.label })) ?? [];
  const activeAccounts = accounts.data?.items.filter((account) => !account.is_archived && !account.is_disabled) ?? [];
  const defaultAccount = activeAccounts.find((account) => account.is_default) ?? activeAccounts[0];

  return (
    <MobileShell>
      <div className="standard-page report-page">
        <PageHeader backHref={null} title={title} />
        <div className="report-month-picker">
          <button aria-label="Previous month" onClick={() => setMonth((value) => moveMonth(value, -1))} type="button"><ChevronLeft aria-hidden="true" size={18} /></button>
          <label><CalendarDays aria-hidden="true" size={16} /><input aria-label="Report month" max={currentMonthKey()} onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label>
          <button aria-label="Next month" disabled={isCurrentMonth} onClick={() => setMonth((value) => moveMonth(value, 1))} type="button"><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
        <div aria-label="Analytics area" className="analytics-kind-grid" role="group">{reportKinds.map((item) => { const Icon = item.icon; return <button aria-pressed={kind === item.value} key={item.value} onClick={() => setKind(item.value)} type="button"><Icon aria-hidden="true" size={17} /><span>{item.label}</span></button>; })}</div>

        {report.isPending ? <ReportLoading /> : null}
        {report.isError ? <div className="report-error" role="alert"><strong>Couldn’t load this report</strong><p>Try again to refresh the selected month.</p><button onClick={() => void report.refetch()} type="button">Try again</button></div> : null}
        {data && (kind === "expense" || kind === "income") ? <>
          <section className="report-hero-card">
            <p>{kind === "expense" ? "Total expenses" : "Total income"} · {reportMonthLabel(month)}</p>
            <strong>{formatMoney(monthlyAmount ?? "0", currency)}</strong>
            <span className={kind === "expense" ? "report-negative" : "report-positive"}>{kind === "expense" ? <TrendingDown aria-hidden="true" size={15} /> : <TrendingUp aria-hidden="true" size={15} />}{formatSignedMoney(data.summary.net_flow_amount, currency)} net flow</span>
          </section>

          {kind === "expense" ? <section aria-labelledby="spending-heading" className="report-card report-spending"><div className="section-heading"><div><p className="eyebrow">BREAKDOWN</p><h2 id="spending-heading">Where money went</h2></div><BarChart3 aria-hidden="true" size={20} /></div>{data.spending.items.length ? <div className="spending-visual"><Donut data={data.spending.items} /><div><strong>{formatMoney(data.spending.total_amount, currency)}</strong><span>spent</span></div></div> : <p className="report-empty">No expense categories for this month.</p>}</section> : <section aria-labelledby="income-heading" className="report-card income-summary"><div className="section-heading"><div><p className="eyebrow">MONTHLY POSITION</p><h2 id="income-heading">Income overview</h2></div><CircleDollarSign aria-hidden="true" size={20} /></div><div className="income-summary-grid"><div><span>Saved</span><strong>{formatMoney(data.summary.savings_amount, currency)}</strong></div><div><span>Goals</span><strong>{data.summary.active_savings_goal_count}</strong></div></div></section>}

          <section aria-labelledby="cash-flow-heading" className="report-card"><div className="section-heading"><div><p className="eyebrow">DAILY ACTIVITY</p><h2 id="cash-flow-heading">{kind === "expense" ? "Spending pace" : "Income pace"}</h2></div><span className="report-amount-chip">{formatMoney(monthlyAmount ?? "0", currency)}</span></div>{cashFlow.length ? <CashFlowBars data={cashFlow} /> : <p className="report-empty">No daily activity for this month.</p>}</section>

          {kind === "expense" ? <section aria-labelledby="categories-heading" className="report-category-section"><div className="list-heading"><span id="categories-heading">Spending categories</span><strong>{data.spending.items.length}</strong></div>{data.spending.items.length ? <div className="report-category-list">{data.spending.items.map((item, index) => <article className="report-category-row" key={`${item.category_id}-${item.category_name}`}><span className="report-category-swatch" style={{ background: chartColors[index % chartColors.length] }} /><div><strong>{item.category_name}</strong><span>{item.percent}% of expenses</span></div><strong>{formatMoney(item.amount, currency)}</strong></article>)}</div> : null}</section> : <section aria-labelledby="insights-heading" className="report-card income-insight"><div className="section-heading"><div><p className="eyebrow">INSIGHT</p><h2 id="insights-heading">Savings direction</h2></div><PiggyBank aria-hidden="true" size={20} /></div><p>{formatReportPercent(data.summary.savings_month_over_month_percent)} compared with last month.</p></section>}
        </> : null}

        {data && kind === "budget" ? <section className="analytics-focus-panel"><div className="analytics-focus-hero analytics-focus-hero--budget"><span><WalletCards aria-hidden="true" size={21} /></span><p>Budget used · {reportMonthLabel(month)}</p><strong>{reportPercent(data.summary.budget_used_percent ?? "0").toFixed(1)}%</strong></div><div className="analytics-focus-facts"><div><span>Budget adherence</span><strong>{reportPercent(data.summary.trends.budget_adherence_percent ?? "0").toFixed(1)}%</strong></div><div><span>Expenses tracked</span><strong>{formatMoney(data.summary.expense_amount, currency)}</strong></div></div><AnalyticsLink href={"/budget" as Route}>Open budget planning</AnalyticsLink></section> : null}

        {data && kind === "goal" ? <section className="analytics-focus-panel"><div className="analytics-focus-hero analytics-focus-hero--goal"><span><Target aria-hidden="true" size={21} /></span><p>Active savings goals</p><strong>{data.summary.active_savings_goal_count}</strong></div><div className="analytics-focus-facts"><div><span>Saved this month</span><strong>{formatMoney(data.summary.savings_amount, currency)}</strong></div><div><span>Monthly change</span><strong>{formatReportPercent(data.summary.savings_month_over_month_percent)}</strong></div></div><AnalyticsLink href={"/goal" as Route}>Open savings goals</AnalyticsLink></section> : null}

        {kind === "loan" ? <section className="analytics-focus-panel">{loanSummary.isPending ? <ReportLoading /> : null}{loanSummary.isError ? <div className="report-error" role="alert"><strong>Couldn’t load loan analytics</strong><p>Try again to refresh your loan position.</p><button onClick={() => void loanSummary.refetch()} type="button">Try again</button></div> : null}{loanSummary.data ? <><div className="analytics-focus-hero analytics-focus-hero--loan"><span><HandCoins aria-hidden="true" size={21} /></span><p>Outstanding loans</p><strong>{formatMoney(loanSummary.data.due_loan, loanSummary.data.currency)}</strong></div><div className="analytics-focus-facts"><div><span>Owed to you</span><strong>{formatMoney(loanSummary.data.total_loan_given, loanSummary.data.currency)}</strong></div><div><span>You owe</span><strong>{formatMoney(loanSummary.data.total_loan_taken, loanSummary.data.currency)}</strong></div></div><AnalyticsLink href={"/loan" as Route}>Open loan records</AnalyticsLink></> : null}</section> : null}

        {kind === "account" ? <section className="analytics-focus-panel">{accounts.isPending ? <ReportLoading /> : null}{accounts.isError ? <div className="report-error" role="alert"><strong>Couldn’t load account analytics</strong><p>Try again to refresh your accounts.</p><button onClick={() => void accounts.refetch()} type="button">Try again</button></div> : null}{accounts.data ? <><div className="analytics-focus-hero analytics-focus-hero--account"><span><Landmark aria-hidden="true" size={21} /></span><p>Active accounts</p><strong>{activeAccounts.length}</strong></div><div className="analytics-focus-facts"><div><span>Default account</span><strong>{defaultAccount?.name ?? "Not set"}</strong></div><div><span>Available balance</span><strong>{defaultAccount ? formatMoney(defaultAccount.current_balance, defaultAccount.currency) : "—"}</strong></div></div><AnalyticsLink href={"/accounts" as Route}>Open all accounts</AnalyticsLink></> : null}</section> : null}
      </div>
    </MobileShell>
  );
}
