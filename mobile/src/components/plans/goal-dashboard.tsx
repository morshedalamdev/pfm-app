"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/home/view-model";
import { getGoalData } from "@/lib/plans/api";
import type { GoalStatus } from "@/lib/plans/types";
import { goalTotals, progressPercent } from "@/lib/plans/utils";

export function GoalDashboard() {
  const [status, setStatus] = useState<GoalStatus>("active");
  const data = useQuery({ queryFn: () => getGoalData(status), queryKey: ["goals", status] });
  const totals = goalTotals(data.data?.goals ?? []);
  const currency = data.data?.goals[0]?.currency ?? data.data?.accounts.find((account) => account.is_default)?.currency ?? "USD";
  return <MobileShell><div className="standard-page goal-page"><PageHeader backHref={null} title="Goals" trailing={<Link aria-label="Create a goal" className="transaction-header-add" href={"/goal/new" as Route}><Plus aria-hidden="true" size={21} /></Link>} />
    <section className="goal-summary-hero"><span><Target aria-hidden="true" size={25} /></span><p className="eyebrow">TOTAL SAVINGS</p><strong>{formatMoney(String(totals.saved), currency)}</strong><div><span>{totals.active} active goals</span><span>{formatMoney(String(totals.target), currency)} target</span></div><ProgressBar accent="purple" label="Overall goal progress" value={totals.percent} /><p>{Math.round(totals.percent)}% complete</p></section>
    <div aria-label="Goal status" className="recurring-status-tabs goal-status-tabs">{(["all", "active", "completed"] as const).map((value) => <button aria-pressed={status === value} key={value} onClick={() => setStatus(value)} type="button">{value}</button>)}</div>
    {data.isPending ? <div aria-busy="true" aria-label="Loading goals" className="plan-loading" role="status"><div /><div /></div> : null}
    {data.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load savings goals</strong><p>{data.error.message}</p><button onClick={() => void data.refetch()} type="button">Try again</button></section> : null}
    {data.data ? <section className="goal-list-section"><div className="section-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2>{status === "all" ? "All goals" : `${status[0]!.toUpperCase()}${status.slice(1)} goals`}</h2></div><span>{data.data.goals.length}</span></div>{data.data.goals.length ? <div className="goal-list">{data.data.goals.map((goal) => { const percent = progressPercent(goal.progress.percent_complete); return <Link className="goal-list-card" href={`/goal/${goal.id}` as Route} key={goal.id}><span className="category-icon accent-coral"><Target aria-hidden="true" size={19} /></span><div><strong>{goal.name}</strong><span>{formatMoney(goal.progress.saved_amount, goal.currency)} of {formatMoney(goal.target_amount, goal.currency)}</span><ProgressBar accent="coral" label={`${goal.name} progress`} value={percent} /></div><span><strong>{Math.round(percent)}%</strong><small>{goal.status}</small></span><ChevronRight aria-hidden="true" size={16} /></Link>; })}</div> : <div className="plan-empty-card"><Target aria-hidden="true" size={24} /><strong>No {status === "all" ? "savings" : status} goals</strong><p>Create a clear target and track every transfer toward it.</p><Link href={"/goal/new" as Route}>Create a goal <ChevronRight aria-hidden="true" size={15} /></Link></div>}</section> : null}
  </div></MobileShell>;
}
