"use client";

import Decimal from "decimal.js";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getReportData } from "@/lib/reports/api";
import { cashFlowHeight, currentMonthKey, formatReportPercent, reportMonthLabel, reportPercent } from "@/lib/reports/utils";
import { formatMoney, formatSignedMoney } from "@/lib/home/view-model";

type ReportKind = "expense" | "income";

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

export function ReportDashboard() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [kind, setKind] = useState<ReportKind>("expense");
  const report = useQuery({ queryFn: () => getReportData(month), queryKey: ["report", month] });
  const isCurrentMonth = month === currentMonthKey();
  const data = report.data;
  const currency = data?.summary.currency ?? "USD";
  const monthlyAmount = kind === "expense" ? data?.spending.total_amount : data?.summary.income_amount;
  const cashFlow = data?.cashFlow.buckets.map((bucket) => ({ amount: bucket[kind === "expense" ? "expense_amount" : "income_amount"], label: bucket.label })) ?? [];

  return (
    <MobileShell>
      <div className="standard-page report-page">
        <PageHeader title="Report" trailing={<ThemeToggle compact />} />
        <div className="report-month-picker">
          <button aria-label="Previous month" onClick={() => setMonth((value) => moveMonth(value, -1))} type="button"><ChevronLeft aria-hidden="true" size={18} /></button>
          <label><CalendarDays aria-hidden="true" size={16} /><input aria-label="Report month" max={currentMonthKey()} onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label>
          <button aria-label="Next month" disabled={isCurrentMonth} onClick={() => setMonth((value) => moveMonth(value, 1))} type="button"><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
        <div aria-label="Report type" className="segmented-control" role="group"><button aria-pressed={kind === "expense"} onClick={() => setKind("expense")} type="button">Expenses</button><button aria-pressed={kind === "income"} onClick={() => setKind("income")} type="button">Income</button></div>

        {report.isPending ? <ReportLoading /> : null}
        {report.isError ? <div className="report-error" role="alert"><strong>Couldn’t load this report</strong><p>Try again to refresh the selected month.</p><button onClick={() => void report.refetch()} type="button">Try again</button></div> : null}
        {data ? <>
          <section className="report-hero-card">
            <p>{kind === "expense" ? "Total expenses" : "Total income"} · {reportMonthLabel(month)}</p>
            <strong>{formatMoney(monthlyAmount ?? "0", currency)}</strong>
            <span className={kind === "expense" ? "report-negative" : "report-positive"}>{kind === "expense" ? <TrendingDown aria-hidden="true" size={15} /> : <TrendingUp aria-hidden="true" size={15} />}{formatSignedMoney(data.summary.net_flow_amount, currency)} net flow</span>
          </section>

          {kind === "expense" ? <section aria-labelledby="spending-heading" className="report-card report-spending"><div className="section-heading"><div><p className="eyebrow">BREAKDOWN</p><h2 id="spending-heading">Where money went</h2></div><BarChart3 aria-hidden="true" size={20} /></div>{data.spending.items.length ? <div className="spending-visual"><Donut data={data.spending.items} /><div><strong>{formatMoney(data.spending.total_amount, currency)}</strong><span>spent</span></div></div> : <p className="report-empty">No expense categories for this month.</p>}</section> : <section aria-labelledby="income-heading" className="report-card income-summary"><div className="section-heading"><div><p className="eyebrow">MONTHLY POSITION</p><h2 id="income-heading">Income overview</h2></div><CircleDollarSign aria-hidden="true" size={20} /></div><div className="income-summary-grid"><div><span>Saved</span><strong>{formatMoney(data.summary.savings_amount, currency)}</strong></div><div><span>Goals</span><strong>{data.summary.active_savings_goal_count}</strong></div></div></section>}

          <section aria-labelledby="cash-flow-heading" className="report-card"><div className="section-heading"><div><p className="eyebrow">DAILY ACTIVITY</p><h2 id="cash-flow-heading">{kind === "expense" ? "Spending pace" : "Income pace"}</h2></div><span className="report-amount-chip">{formatMoney(monthlyAmount ?? "0", currency)}</span></div>{cashFlow.length ? <CashFlowBars data={cashFlow} /> : <p className="report-empty">No daily activity for this month.</p>}</section>

          {kind === "expense" ? <section aria-labelledby="categories-heading" className="report-category-section"><div className="list-heading"><span id="categories-heading">Spending categories</span><strong>{data.spending.items.length}</strong></div>{data.spending.items.length ? <div className="report-category-list">{data.spending.items.map((item, index) => <article className="report-category-row" key={`${item.category_id}-${item.category_name}`}><span className="report-category-swatch" style={{ background: chartColors[index % chartColors.length] }} /><div><strong>{item.category_name}</strong><span>{item.percent}% of expenses</span></div><strong>{formatMoney(item.amount, currency)}</strong></article>)}</div> : null}</section> : <section aria-labelledby="insights-heading" className="report-card income-insight"><div className="section-heading"><div><p className="eyebrow">INSIGHT</p><h2 id="insights-heading">Savings direction</h2></div><PiggyBank aria-hidden="true" size={20} /></div><p>{formatReportPercent(data.summary.savings_month_over_month_percent)} compared with last month.</p></section>}
        </> : null}
      </div>
    </MobileShell>
  );
}
