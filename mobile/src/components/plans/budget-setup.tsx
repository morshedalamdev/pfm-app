"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, WalletCards } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/home/view-model";
import { createBudget, deleteBudget, getBudgetData, updateBudget } from "@/lib/plans/api";
import { isPositiveMoney } from "@/lib/plans/utils";
import { currentMonthKey, reportMonthLabel } from "@/lib/reports/utils";
import type { BudgetData } from "@/lib/plans/types";

function BudgetSetupEditor({ data, month }: { data: BudgetData; month: string }) {
  const router = useRouter(); const queryClient = useQueryClient();
  const overallBudget = data.budgets.find((budget) => budget.category_id === null);
  const [monthly, setMonthly] = useState(overallBudget?.limit_amount ?? "");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(data.budgets.filter((budget) => budget.category_id).map((budget) => [budget.category_id!, budget.limit_amount])));
  const [error, setError] = useState<string | null>(null);
  const allocated = useMemo(() => Object.values(amounts).reduce((sum, value) => sum + Number(value || 0), 0), [amounts]);
  const monthlyNumber = Number(monthly || 0); const remaining = monthlyNumber - allocated; const percent = monthlyNumber > 0 ? Math.min(100, (allocated / monthlyNumber) * 100) : 0;
  const currency = data.budgets[0]?.currency ?? data.accounts.find((account) => account.is_default)?.currency ?? data.accounts[0]?.currency ?? "USD";
  const save = useMutation({ mutationFn: async () => {
    if (monthly && !isPositiveMoney(monthly)) throw new Error("Enter a positive monthly budget or leave it empty.");
    const invalidCategory = Object.values(amounts).some((value) => value !== "" && !isPositiveMoney(value));
    if (invalidCategory) throw new Error("Category budgets must be positive amounts or empty.");
    if (!monthlyNumber && !Object.values(amounts).some((value) => Number(value) > 0)) throw new Error("Enter a monthly budget or at least one category budget.");
    const existing = data.budgets; const operations: Promise<unknown>[] = []; const overall = existing.find((budget) => budget.category_id === null);
    if (monthlyNumber > 0) operations.push(overall ? updateBudget(overall.id, { currency, limit_amount: monthly }) : createBudget(month, { category_id: null, currency, limit_amount: monthly, period_type: "monthly" })); else if (overall) operations.push(deleteBudget(overall.id));
    for (const category of data.categories) { const value = amounts[category.id] ?? ""; const budget = existing.find((item) => item.category_id === category.id); if (Number(value) > 0) operations.push(budget ? updateBudget(budget.id, { currency, limit_amount: value }) : createBudget(month, { category_id: category.id, currency, limit_amount: value, period_type: "monthly" })); else if (budget) operations.push(deleteBudget(budget.id)); }
    await Promise.all(operations);
  }, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["budgets"] }), queryClient.invalidateQueries({ queryKey: ["budget-setup"] })]); router.replace("/budget" as Route); }, onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to save budgets.") });
  function submit(event: FormEvent) { event.preventDefault(); setError(null); save.mutate(); }
  return <form className="budget-setup-form" onSubmit={submit}><section className="budget-setup-intro"><span><CircleDollarSign aria-hidden="true" size={21} /></span><div><p className="eyebrow">{reportMonthLabel(month)}</p><h2>Give every dollar a job.</h2><p>Set the full limit, then choose how much belongs to each spending category.</p></div></section><label className="budget-total-field"><span>Monthly budget</span><div><small>{currency}</small><input aria-label="Monthly budget" inputMode="decimal" onChange={(event) => setMonthly(event.target.value)} placeholder="0.00" value={monthly} /></div></label><section className="budget-allocation-summary"><div><span><small>Allocated</small><strong>{formatMoney(String(allocated), currency)}</strong></span><span><small>Remaining</small><strong className={remaining < 0 ? "amount-negative" : undefined}>{formatMoney(String(remaining), currency)}</strong></span></div><ProgressBar accent={remaining < 0 ? "coral" : "purple"} label="Budget allocated" value={percent} /><p>{Math.round(percent)}% allocated</p></section><section className="budget-category-fields"><div className="section-heading"><div><p className="eyebrow">CATEGORIES</p><h2>Set category limits</h2></div><WalletCards aria-hidden="true" size={20} /></div>{data.categories.map((category) => <label key={category.id}><span>{category.name}</span><div><small>{currency}</small><input aria-label={`${category.name} budget`} inputMode="decimal" onChange={(event) => setAmounts((current) => ({ ...current, [category.id]: event.target.value }))} placeholder="0.00" value={amounts[category.id] ?? ""} /></div></label>)}</section>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="save-transaction-button" disabled={save.isPending} type="submit">{save.isPending ? "Saving…" : "Save budget"}</button></form>;
}

export function BudgetSetup() {
  const month = currentMonthKey();
  const setup = useQuery({ queryFn: () => getBudgetData(month), queryKey: ["budget-setup", month] });
  return <MobileShell><div className="standard-page budget-setup-page"><PageHeader backHref={"/budget" as Route} title="Budget setup" />{setup.isPending ? <div aria-busy="true" className="transaction-form-skeleton" /> : null}{setup.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load budget setup</strong><p>{setup.error.message}</p><button onClick={() => void setup.refetch()} type="button">Try again</button></section> : null}{setup.data ? <BudgetSetupEditor data={setup.data} key={setup.dataUpdatedAt} month={month} /> : null}</div></MobileShell>;
}
