"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, CalendarClock, CheckCircle2, ChevronRight, PauseCircle, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { completeReminder, getRecurringOverview } from "@/lib/recurring/api";
import type { DueReminder } from "@/lib/recurring/types";
import { formatRecurringDate, recurringCadence, recurringTitle } from "@/lib/recurring/utils";
import { formatMoney } from "@/lib/home/view-model";

type StatusFilter = "all" | "active" | "paused";

export function RecurringDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryFn: getRecurringOverview, queryKey: ["recurring"] });
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedReminder, setSelectedReminder] = useState<DueReminder | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const complete = useMutation({ mutationFn: completeReminder });
  const rules = useMemo(() => overview.data?.rules.filter((rule) => status === "all" || rule.status === status) ?? [], [overview.data?.rules, status]);

  async function finishReminder() {
    if (!selectedReminder) return;
    setActionError(null);
    try {
      await complete.mutateAsync(selectedReminder);
      setSelectedReminder(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recurring"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to record this reminder."); }
  }

  const selectedAccount = overview.data?.accounts.find((item) => item.id === selectedReminder?.rule.account_id);
  const selectedCategory = overview.data?.categories.find((item) => item.id === selectedReminder?.rule.category_id);

  return <MobileShell><div className="standard-page recurring-page"><PageHeader backHref={null} title="Recurring" trailing={<Link aria-label="Add recurring item" className="transaction-header-add" href={"/transaction/recurring/new" as Route}><Plus aria-hidden="true" size={20} /></Link>} />
    <section className="recurring-hero"><span><CalendarClock aria-hidden="true" size={25} /></span><div><p className="eyebrow">AUTOMATIONS</p><h2>Keep repeat money on schedule.</h2><p>Nothing changes your balance until a due reminder is confirmed.</p></div></section>
    {overview.isPending ? <div aria-busy="true" aria-label="Loading recurring items" className="recurring-loading"><span /><span /></div> : null}
    {overview.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load recurring items</strong><p>{overview.error.message}</p><button onClick={() => void overview.refetch()} type="button">Try again</button></section> : null}
    {overview.data ? <>
      {overview.data.reminders.length ? <section className="due-reminders"><div className="section-heading"><div><p className="eyebrow">NEEDS YOU</p><h2>Due now</h2></div><span>{overview.data.reminders.length}</span></div><div>{overview.data.reminders.map((reminder) => <button className={`due-reminder-card due-reminder-card--${reminder.reminder_type}`} key={`${reminder.reminder_type}:${reminder.reminder_key}`} onClick={() => { setActionError(null); setSelectedReminder(reminder); }} type="button"><span className={`category-icon ${reminder.reminder_type === "income" ? "accent-green" : "accent-orange"}`}>{reminder.reminder_type === "income" ? <ArrowDownLeft aria-hidden="true" size={19} /> : <ArrowUpRight aria-hidden="true" size={19} />}</span><span><strong>{recurringTitle(reminder.rule)}</strong><small>{formatRecurringDate(reminder.due_at, reminder.rule.timezone)} · confirm {reminder.reminder_type === "income" ? "received" : "paid"}</small></span><strong>{formatMoney(reminder.rule.amount, reminder.rule.currency)}</strong><ChevronRight aria-hidden="true" size={16} /></button>)}</div></section> : <section className="recurring-clear-card"><CheckCircle2 aria-hidden="true" size={21} /><div><strong>Nothing needs confirmation</strong><span>Due income and expenses will appear here.</span></div></section>}
      <section className="recurring-list-section"><div className="section-heading"><div><p className="eyebrow">SCHEDULES</p><h2>Your recurring items</h2></div></div><div aria-label="Recurring status" className="recurring-status-tabs">{(["all", "active", "paused"] as const).map((value) => <button aria-pressed={status === value} key={value} onClick={() => setStatus(value)} type="button">{value}</button>)}</div><div className="recurring-rule-list">{rules.length ? rules.map((rule) => <Link className="recurring-rule-card" href={`/transaction/recurring/${rule.id}` as Route} key={rule.id}><span className={`category-icon ${rule.transaction_type === "income" ? "accent-green" : "accent-orange"}`}>{rule.status === "paused" ? <PauseCircle aria-hidden="true" size={19} /> : <CalendarCheck aria-hidden="true" size={19} />}</span><span><strong>{recurringTitle(rule)}</strong><small>{recurringCadence(rule)} · next {formatRecurringDate(rule.next_run_at, rule.timezone)}</small></span><span><strong>{formatMoney(rule.amount, rule.currency)}</strong><small>{rule.status}</small></span><ChevronRight aria-hidden="true" size={16} /></Link>) : <div className="recurring-empty"><CalendarClock aria-hidden="true" size={23} /><strong>No {status === "all" ? "recurring" : status} items</strong><Link href={"/transaction/recurring/new" as Route}>Create a schedule</Link></div>}</div></section>
    </> : null}
    <Drawer onOpenChange={(open) => { if (!open) setSelectedReminder(null); }} open={Boolean(selectedReminder)}><DrawerContent><DrawerHeader><DrawerTitle>{selectedReminder?.reminder_type === "income" ? "Confirm income received" : "Confirm expense paid"}</DrawerTitle><DrawerDescription>This creates the transaction and updates the selected account balance.</DrawerDescription></DrawerHeader>{selectedReminder ? <div className="reminder-drawer-details"><strong>{formatMoney(selectedReminder.rule.amount, selectedReminder.rule.currency)}</strong><span>{recurringTitle(selectedReminder.rule)}</span><dl><div><dt>Account</dt><dd>{selectedAccount?.name ?? "Selected account"}</dd></div><div><dt>Category</dt><dd>{selectedCategory?.name ?? selectedReminder.reminder_type}</dd></div><div><dt>Due</dt><dd>{formatRecurringDate(selectedReminder.due_at, selectedReminder.rule.timezone)}</dd></div></dl></div> : null}{actionError ? <p className="drawer-error" role="alert">{actionError}</p> : null}<DrawerFooter><button className="reminder-confirm-button" disabled={complete.isPending} onClick={() => void finishReminder()} type="button">{complete.isPending ? "Saving…" : selectedReminder?.reminder_type === "income" ? "Mark received" : "Mark paid"}</button><DrawerClose asChild><button className="drawer-close-button" type="button">Not yet</button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
