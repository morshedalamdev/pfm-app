"use client";

import { CircleDollarSign, PiggyBank, Plus, Target, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { createBudget, createContribution, createSavingsGoal, getPlanData } from "@/lib/plans/api";
import { isPositiveMoney, progressPercent } from "@/lib/plans/utils";
import type { Budget, SavingsGoal } from "@/lib/plans/types";
import { formatMoney } from "@/lib/home/view-model";
import { currentMonthKey, reportMonthLabel } from "@/lib/reports/utils";

type CreatorMode = "budget" | "goal";

function FormError({ message }: { message: string | null }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}

function PlanCreator({ categories, month, onClose }: { categories: { id: string; name: string }[]; month: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CreatorMode>("goal");
  const [error, setError] = useState<string | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const goalMutation = useMutation({ mutationFn: createSavingsGoal });
  const budgetMutation = useMutation({ mutationFn: () => createBudget(month, { category_id: categoryId || null, currency, limit_amount: budgetAmount, period_type: "monthly" }) });
  const busy = goalMutation.isPending || budgetMutation.isPending;

  async function submit() {
    setError(null);
    if (mode === "goal") {
      if (!goalName.trim() || !isPositiveMoney(goalAmount) || !/^\d+(?:\.\d{1,4})?$/.test(monthlyTarget)) {
        setError("Enter a goal name, positive target, and valid monthly amount.");
        return;
      }
      try {
        await goalMutation.mutateAsync({ currency, monthly_target_amount: monthlyTarget, name: goalName.trim(), note: null, target_amount: goalAmount, target_date: targetDate || null });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to create the savings goal.");
        return;
      }
    } else {
      if (!isPositiveMoney(budgetAmount)) {
        setError("Enter a positive budget amount.");
        return;
      }
      try {
        await budgetMutation.mutateAsync();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to create the budget.");
        return;
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["plans"] });
    onClose();
  }

  return <section aria-labelledby="create-plan-heading" className="plan-form-sheet">
    <div className="section-heading"><div><p className="eyebrow">NEW PLAN</p><h2 id="create-plan-heading">Create a plan</h2></div><button aria-label="Close plan form" className="icon-button icon-button--plain" onClick={onClose} type="button"><X aria-hidden="true" size={20} /></button></div>
    <div aria-label="Plan type" className="transaction-kind-tabs plan-kind-tabs" role="group"><button aria-pressed={mode === "goal"} onClick={() => setMode("goal")} type="button">Goal</button><button aria-pressed={mode === "budget"} onClick={() => setMode("budget")} type="button">Budget</button></div>
    {mode === "goal" ? <div className="plan-form-fields"><label><span>Goal name</span><input aria-label="Goal name" onChange={(event) => setGoalName(event.target.value)} value={goalName} /></label><label><span>Target amount</span><input aria-label="Target amount" inputMode="decimal" onChange={(event) => setGoalAmount(event.target.value)} value={goalAmount} /></label><label><span>Monthly target</span><input aria-label="Monthly target" inputMode="decimal" onChange={(event) => setMonthlyTarget(event.target.value)} value={monthlyTarget} /></label><label><span>Target date</span><input aria-label="Target date" min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} type="date" value={targetDate} /></label><label><span>Currency</span><input aria-label="Goal currency" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label></div> : <div className="plan-form-fields"><label><span>Budget limit</span><input aria-label="Budget limit" inputMode="decimal" onChange={(event) => setBudgetAmount(event.target.value)} value={budgetAmount} /></label><label><span>Category</span><select aria-label="Budget category" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}><option value="">Overall spending</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label><span>Month</span><input aria-label="Budget month" disabled value={reportMonthLabel(month)} /></label><label><span>Currency</span><input aria-label="Budget currency" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label></div>}
    <FormError message={error} /><button className="save-transaction-button" disabled={busy} onClick={() => void submit()} type="button">{busy ? "Saving…" : `Create ${mode}`}</button>
  </section>;
}

function ContributionForm({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => createContribution(goal.id, { amount, contributed_at: new Date().toISOString(), note: null }) });
  async function submit() {
    if (!isPositiveMoney(amount)) { setError("Enter a positive contribution amount."); return; }
    setError(null);
    try { await mutation.mutateAsync(); await queryClient.invalidateQueries({ queryKey: ["plans"] }); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add the contribution."); }
  }
  return <div className="contribution-form"><label><span>Add to {goal.name}</span><input aria-label={`Contribution amount for ${goal.name}`} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="0.00" value={amount} /></label><FormError message={error} /><div><button className="text-button" onClick={onClose} type="button">Cancel</button><button className="contribution-save" disabled={mutation.isPending} onClick={() => void submit()} type="button">{mutation.isPending ? "Adding…" : "Add money"}</button></div></div>;
}

function GoalCard({ goal, onContribute }: { goal: SavingsGoal; onContribute: () => void }) {
  const percent = progressPercent(goal.progress.percent_complete);
  return <article className="goal-card live-goal-card"><div className="goal-title-row"><span className="category-icon accent-coral"><Target aria-hidden="true" size={20} /></span><div><strong>{goal.name}</strong><span>{goal.target_date ? `Target · ${new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${goal.target_date}T00:00:00`))}` : "Open-ended goal"}</span></div><button className="goal-contribute-button" onClick={onContribute} type="button">Add</button></div><p className="goal-amount"><strong>{formatMoney(goal.progress.saved_amount, goal.currency)}</strong> of {formatMoney(goal.target_amount, goal.currency)}</p><ProgressBar accent="coral" label={`${goal.name} progress`} value={percent} /><div className="goal-progress-copy"><span>Your progress</span><strong>{formatMoney(goal.progress.remaining_amount, goal.currency)} left</strong></div>{goal.monthly_target_amount !== "0" ? <p className="goal-alert">Monthly target: {formatMoney(goal.monthly_target_amount, goal.currency)}</p> : null}</article>;
}

function BudgetRow({ budget, index }: { budget: Budget; index: number }) {
  const accent = (["blue", "orange", "purple", "green"] as const)[index % 4]!;
  const percent = progressPercent(budget.progress.percent_used);
  return <article className="budget-row"><span className={`category-icon accent-${accent}`}><WalletCards aria-hidden="true" size={20} /></span><div><strong>{budget.category_name ?? "Overall spending"}</strong><span>{formatMoney(budget.progress.spent_amount, budget.currency)} of {formatMoney(budget.limit_amount, budget.currency)}</span><ProgressBar accent={accent} label={`${budget.category_name ?? "Overall"} budget progress`} value={percent} /></div><strong className={`budget-percent accent-text-${accent}`}>{Math.round(percent)}%</strong></article>;
}

export function PlanDashboard() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const plans = useQuery({ queryFn: () => getPlanData(month), queryKey: ["plans", month] });

  return <MobileShell><div className="standard-page plan-page"><PageHeader title="My Plan" trailing={<><label className="plan-month"><input aria-label="Plan month" max={currentMonthKey()} onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label><button aria-label="Create a plan" className="icon-button icon-button--dark" onClick={() => setCreatorOpen(true)} type="button"><Plus aria-hidden="true" size={20} /></button></>} />
    {creatorOpen && plans.data ? <PlanCreator categories={plans.data.categories} month={month} onClose={() => setCreatorOpen(false)} /> : null}
    {plans.isPending ? <div aria-busy="true" aria-label="Loading plans" className="plan-loading" role="status"><div /><div /></div> : null}
    {plans.isError ? <div className="report-error" role="alert"><strong>Couldn’t load your plans</strong><p>Try again to refresh budgets and goals.</p><button onClick={() => void plans.refetch()} type="button">Try again</button></div> : null}
    {plans.data ? <><section className="plan-section"><div className="section-heading section-heading--compact"><div><p className="eyebrow">SAVINGS</p><h2>Goals</h2></div><PiggyBank aria-hidden="true" size={20} /></div>{plans.data.goals.length ? <div className="plan-goal-list">{plans.data.goals.map((goal) => <div key={goal.id}><GoalCard goal={goal} onContribute={() => setContributionGoal(goal)} />{contributionGoal?.id === goal.id ? <ContributionForm goal={goal} onClose={() => setContributionGoal(null)} /> : null}</div>)}</div> : <p className="plan-empty">No active savings goals yet. Create one to start tracking progress.</p>}</section>
      <section className="plan-section budget-heading"><div className="section-heading section-heading--compact"><div><p className="eyebrow">{reportMonthLabel(month)}</p><h2>Budgets</h2></div><CircleDollarSign aria-hidden="true" size={20} /></div>{plans.data.budgets.length ? <div className="stack-list">{plans.data.budgets.map((budget, index) => <BudgetRow budget={budget} index={index} key={budget.id} />)}</div> : <p className="plan-empty">No budgets for this month. Create one to set a spending limit.</p>}</section></> : null}
  </div></MobileShell>;
}
