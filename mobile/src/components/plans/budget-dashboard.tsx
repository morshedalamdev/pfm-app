"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Settings2, Trash2, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/home/view-model";
import { deleteBudget, getBudgetData } from "@/lib/plans/api";
import type { Budget } from "@/lib/plans/types";
import { budgetTotals, progressPercent } from "@/lib/plans/utils";
import { currentMonthKey, reportMonthLabel } from "@/lib/reports/utils";

export function BudgetDashboard() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthKey);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = useQuery({ queryFn: () => getBudgetData(month), queryKey: ["budgets", month] });
  const remove = useMutation({ mutationFn: deleteBudget });
  const totals = budgetTotals(data.data?.budgets ?? []);
  const currency = data.data?.budgets[0]?.currency ?? data.data?.accounts.find((account) => account.is_default)?.currency ?? "USD";
  const percent = totals.limit > 0 ? progressPercent(String((totals.spent / totals.limit) * 100)) : 0;

  async function confirmDelete() {
    if (!selected) return;
    setError(null);
    try {
      await remove.mutateAsync(selected.id);
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove this budget.");
    }
  }

  return <MobileShell><div className="standard-page budget-page"><PageHeader backHref={null} title="Budget" trailing={<><label className="plan-month"><span className="sr-only">Budget month</span><input aria-label="Budget month" max={currentMonthKey()} onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label><Link aria-label="Set up budgets" className="transaction-header-add" href={"/budget/setup" as Route}><Settings2 aria-hidden="true" size={19} /></Link></>} />
    <section className="budget-summary-hero"><p className="eyebrow">{reportMonthLabel(month)}</p><h2>Monthly budget</h2><strong>{formatMoney(String(totals.limit), currency)}</strong><div><span><small>Spent</small><strong>{formatMoney(String(totals.spent), currency)}</strong></span><span><small>Remaining</small><strong>{formatMoney(String(totals.remaining), currency)}</strong></span></div><ProgressBar accent={totals.remaining < 0 ? "coral" : "purple"} label="Monthly budget used" value={percent} /><p>{Math.round(percent)}% used</p></section>
    {data.isPending ? <div aria-busy="true" aria-label="Loading budgets" className="plan-loading" role="status"><div /><div /></div> : null}
    {data.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load budgets</strong><p>{data.error.message}</p><button onClick={() => void data.refetch()} type="button">Try again</button></section> : null}
    {data.data ? <section className="budget-list-section"><div className="section-heading"><div><p className="eyebrow">ALLOCATIONS</p><h2>Your budgets</h2></div><span>{data.data.budgets.length}</span></div>{data.data.budgets.length ? <div className="budget-card-list">{data.data.budgets.map((budget, index) => { const used = progressPercent(budget.progress.percent_used); return <article className="budget-allocation-card" key={budget.id}><span className={`category-icon accent-${(["purple", "orange", "blue", "green"] as const)[index % 4]}`}><WalletCards aria-hidden="true" size={19} /></span><div><strong>{budget.category_name ?? "Overall spending"}</strong><span>{formatMoney(budget.progress.spent_amount, budget.currency)} of {formatMoney(budget.limit_amount, budget.currency)}</span><ProgressBar accent="purple" label={`${budget.category_name ?? "Overall"} budget used`} value={used} /></div><strong className={budget.progress.status === "over_budget" ? "budget-status budget-status--over" : "budget-status"}>{Math.round(used)}%</strong><button aria-label={`Delete ${budget.category_name ?? "overall"} budget`} onClick={() => { setError(null); setSelected(budget); }} type="button"><Trash2 aria-hidden="true" size={16} /></button></article>; })}</div> : <div className="plan-empty-card"><WalletCards aria-hidden="true" size={24} /><strong>No budget for {reportMonthLabel(month)}</strong><p>Set one monthly limit, then divide it across the categories that matter.</p><Link href={"/budget/setup" as Route}>Set up budget <ChevronRight aria-hidden="true" size={15} /></Link></div>}</section> : null}
    <Drawer onOpenChange={(open) => { if (!open) setSelected(null); }} open={Boolean(selected)}><DrawerContent><DrawerHeader><DrawerTitle>Delete {selected?.category_name ?? "overall"} budget?</DrawerTitle><DrawerDescription>This removes the limit only. Existing transactions and spending history stay unchanged.</DrawerDescription></DrawerHeader>{error ? <p className="drawer-error" role="alert">{error}</p> : null}<DrawerFooter><button className="drawer-danger-button" disabled={remove.isPending} onClick={() => void confirmDelete()} type="button">{remove.isPending ? "Deleting…" : "Delete budget"}</button><DrawerClose asChild><button className="drawer-close-button" type="button">Keep budget</button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
