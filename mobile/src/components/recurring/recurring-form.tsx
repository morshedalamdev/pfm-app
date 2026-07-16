"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createRecurringRule, getRecurringEditorData, updateRecurringRule } from "@/lib/recurring/api";
import type { RecurringOptions, RecurringRule } from "@/lib/recurring/types";
import { isPositiveMoney, localDateTime } from "@/lib/recurring/utils";

type FormData = RecurringOptions & { rule: RecurringRule | null };

function RecurringFields({ data }: { data: FormData }) {
  const router = useRouter(); const queryClient = useQueryClient(); const rule = data.rule;
  const [kind, setKind] = useState<"expense" | "income">(rule?.transaction_type === "income" ? "income" : "expense");
  const [accountId, setAccountId] = useState(rule?.account_id ?? data.accounts.find((item) => item.is_default)?.id ?? data.accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(rule?.category_id ?? data.categories.find((item) => item.kind === kind)?.id ?? "");
  const [amount, setAmount] = useState(rule?.amount ?? ""); const [description, setDescription] = useState(rule?.description ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">((rule?.frequency as "daily" | "weekly" | "monthly" | "yearly" | undefined) ?? "monthly");
  const [intervalCount, setIntervalCount] = useState(String(rule?.interval_count ?? 1));
  const [startAt, setStartAt] = useState(localDateTime(rule?.start_at)); const [endAt, setEndAt] = useState(rule?.end_at ? localDateTime(rule.end_at) : "");
  const [error, setError] = useState<string | null>(null); const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const hasCategory = data.categories.some((item) => item.kind === kind);
  const missingSetup = !data.accounts.length || !hasCategory;
  const returnPath = rule ? `/transaction/recurring/${rule.id}/edit` : "/transaction/recurring/new";
  const save = useMutation({ mutationFn: async () => {
    const payload = { account_id: accountId, amount, category_id: categoryId, description: description.trim() || null, end_at: endAt ? new Date(endAt).toISOString() : null, frequency, interval_count: Number(intervalCount), start_at: new Date(startAt).toISOString(), timezone, transaction_type: kind };
    return rule ? updateRecurringRule(rule.id, payload) : createRecurringRule(payload);
  }});
  function changeKind(value: typeof kind) { setKind(value); setCategoryId(data.categories.find((item) => item.kind === value)?.id ?? ""); }
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); const interval = Number(intervalCount); if (!accountId || !categoryId || !isPositiveMoney(amount) || !Number.isInteger(interval) || interval < 1 || interval > 365 || !startAt || (endAt && new Date(endAt) <= new Date(startAt))) { setError("Choose an account and category, enter a positive amount, and check the schedule dates."); return; } try { const saved = await save.mutateAsync(); await queryClient.invalidateQueries({ queryKey: ["recurring"] }); router.replace(`/transaction/recurring/${saved.id}` as Route); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this recurring item."); } }

  return <form className="recurring-form" noValidate onSubmit={(event) => void submit(event)}><div aria-label="Recurring type" className="transaction-kind-tabs"><button aria-pressed={kind === "expense"} onClick={() => changeKind("expense")} type="button">expense</button><button aria-pressed={kind === "income"} onClick={() => changeKind("income")} type="button">income</button></div>{missingSetup ? <section className="setup-requirement" role="status"><div><strong>Finish setup to schedule this</strong><p>Recurring items need an active account and a matching category.</p></div><div>{!data.accounts.length ? <Link href={`/accounts/new?next=${encodeURIComponent(returnPath)}` as Route}>Add account</Link> : null}{!hasCategory ? <Link href={`/settings/categories/new?kind=${kind}&next=${encodeURIComponent(returnPath)}` as Route}>Add {kind} category</Link> : null}</div></section> : null}<div className="form-card"><label className="transaction-field"><span>Account</span><select aria-label="Account" onChange={(event) => setAccountId(event.target.value)} value={accountId}><option value="">Choose account</option>{data.accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><label className="transaction-field"><span>Category</span><select aria-label="Category" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}><option value="">Choose category</option>{data.categories.filter((item) => item.kind === kind).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="transaction-field"><span>Amount</span><input aria-label="Amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="0.00" value={amount} /></label><label className="transaction-field"><span>Note</span><textarea aria-label="Note" maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Rent, salary, subscription…" rows={3} value={description} /></label></div><div className="form-card recurring-schedule-fields"><div className="management-form-grid"><label className="transaction-field"><span>Frequency</span><select aria-label="Frequency" onChange={(event) => setFrequency(event.target.value as typeof frequency)} value={frequency}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><label className="transaction-field"><span>Repeat every</span><input aria-label="Repeat every" inputMode="numeric" max={365} min={1} onChange={(event) => setIntervalCount(event.target.value)} type="number" value={intervalCount} /></label></div><label className="transaction-field"><span>Starts</span><input aria-label="Starts" onChange={(event) => setStartAt(event.target.value)} type="datetime-local" value={startAt} /></label><label className="transaction-field"><span>Ends (optional)</span><input aria-label="Ends" min={startAt} onChange={(event) => setEndAt(event.target.value)} type="datetime-local" value={endAt} /></label><small>Times use {timezone}.</small></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="save-transaction-button" disabled={save.isPending || missingSetup} type="submit">{save.isPending ? "Saving…" : rule ? "Save schedule" : "Create schedule"}</button></form>;
}

export function RecurringForm({ ruleId }: { ruleId?: string }) {
  const editor = useQuery({ queryFn: () => getRecurringEditorData(ruleId), queryKey: ["recurring-editor", ruleId ?? "new"] });
  return <MobileShell><div className="standard-page recurring-form-page"><PageHeader backHref={ruleId ? `/transaction/recurring/${ruleId}` as Route : "/transaction/recurring" as Route} title={ruleId ? "Edit recurring" : "New recurring"} trailing={<ThemeToggle compact />} />{editor.isPending ? <div aria-busy="true" className="transaction-form-skeleton" /> : null}{editor.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t prepare this schedule</strong><p>{editor.error.message}</p><button onClick={() => void editor.refetch()} type="button">Try again</button></section> : null}{editor.data ? <RecurringFields data={editor.data} /> : null}</div></MobileShell>;
}
