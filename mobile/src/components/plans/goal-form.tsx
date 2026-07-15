"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { createSavingsGoal, getGoalEditorData, updateSavingsGoal } from "@/lib/plans/api";
import { isMoney, isPositiveMoney } from "@/lib/plans/utils";

const currencies = ["USD", "EUR", "GBP", "BDT", "INR", "PKR", "MYR", "CAD", "AUD", "JPY", "CNY"];
type EditorData = Awaited<ReturnType<typeof getGoalEditorData>>;

function GoalEditor({ data, goalId }: { data: EditorData; goalId?: string }) {
  const router = useRouter(); const queryClient = useQueryClient(); const goal = data.goal;
  const [name, setName] = useState(goal?.name ?? ""); const [target, setTarget] = useState(goal?.target_amount ?? ""); const [monthly, setMonthly] = useState(goal?.monthly_target_amount ?? "0"); const [targetDate, setTargetDate] = useState(goal?.target_date ?? ""); const [currency, setCurrency] = useState(goal?.currency ?? data.accounts.find((account) => account.is_default)?.currency ?? data.accounts[0]?.currency ?? "USD"); const [note, setNote] = useState(goal?.note ?? ""); const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: async () => { if (!name.trim()) throw new Error("Enter a goal name."); if (!isPositiveMoney(target)) throw new Error("Enter a positive target amount."); if (!isMoney(monthly)) throw new Error("Enter a valid monthly target."); const payload = { currency, monthly_target_amount: monthly, name: name.trim(), note: note.trim() || null, target_amount: target, target_date: targetDate || null }; return goalId ? updateSavingsGoal(goalId, payload) : createSavingsGoal(payload); }, onSuccess: async (savedGoal) => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["goals"] }), queryClient.invalidateQueries({ queryKey: ["goal-detail", savedGoal.id] })]); router.replace(`/goal/${savedGoal.id}` as Route); }, onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to save this goal.") });
  function submit(event: FormEvent) { event.preventDefault(); setError(null); save.mutate(); }
  return <form className="goal-form" onSubmit={submit}><section className="goal-form-intro"><p className="eyebrow">SAVINGS TARGET</p><h2>{goalId ? "Keep the goal realistic." : "Make progress feel possible."}</h2><p>Choose a clear target and a monthly pace you can keep.</p></section><div className="form-card"><label className="transaction-field"><span>Goal name</span><input aria-label="Goal name" maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Emergency fund" value={name} /></label><label className="transaction-field"><span>Target amount</span><input aria-label="Target amount" inputMode="decimal" onChange={(event) => setTarget(event.target.value)} placeholder="0.00" value={target} /></label><label className="transaction-field"><span>Monthly target</span><input aria-label="Monthly target" inputMode="decimal" onChange={(event) => setMonthly(event.target.value)} placeholder="0.00" value={monthly} /></label><label className="transaction-field"><span>Target date (optional)</span><input aria-label="Target date" min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} type="date" value={targetDate} /></label><label className="transaction-field"><span>Currency</span><select aria-label="Goal currency" disabled={Boolean(goalId)} onChange={(event) => setCurrency(event.target.value)} value={currency}>{currencies.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="transaction-field"><span>Note (optional)</span><textarea aria-label="Goal note" maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Why this goal matters…" rows={3} value={note} /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="save-transaction-button" disabled={save.isPending} type="submit">{save.isPending ? "Saving…" : goalId ? "Save goal" : "Create goal"}</button></form>;
}

export function GoalForm({ goalId }: { goalId?: string }) {
  const editor = useQuery({ queryFn: () => getGoalEditorData(goalId), queryKey: ["goal-editor", goalId ?? "new"] });
  return <MobileShell><div className="standard-page goal-form-page"><PageHeader backHref={(goalId ? `/goal/${goalId}` : "/goal") as Route} title={goalId ? "Edit goal" : "New goal"} />{editor.isPending ? <div aria-busy="true" className="transaction-form-skeleton" /> : null}{editor.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load goal form</strong><p>{editor.error.message}</p><button onClick={() => void editor.refetch()} type="button">Try again</button></section> : null}{editor.data ? <GoalEditor data={editor.data} goalId={goalId} key={editor.dataUpdatedAt} /> : null}</div></MobileShell>;
}
