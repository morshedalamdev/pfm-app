"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, HandCoins, Plus, Search, UsersRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/home/view-model";
import { getLoanOverview } from "@/lib/loans/api";
import type { LoanDirectionFilter, LoanStatusFilter } from "@/lib/loans/types";
import { isOverdue, loanPercent, loanPersonName } from "@/lib/loans/utils";

export function LoanDashboard() {
  const [direction, setDirection] = useState<LoanDirectionFilter>("all"); const [status, setStatus] = useState<LoanStatusFilter>("all"); const [search, setSearch] = useState("");
  const data = useQuery({ queryFn: () => getLoanOverview(direction, status), queryKey: ["loans", direction, status] });
  const records = useMemo(() => { const query = search.trim().toLowerCase(); if (!query || !data.data) return data.data?.records ?? []; return data.data.records.filter((record) => [loanPersonName(record, data.data.people), record.note, record.direction, record.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))); }, [data.data, search]);
  const currency = data.data?.summary.currency ?? "USD";
  return <MobileShell><div className="standard-page loan-page"><PageHeader backHref={null} title="Loans" trailing={<><Link aria-label="Manage loan people" className="loan-header-people" href={"/loan/people" as Route}><UsersRound aria-hidden="true" size={19} /></Link><Link aria-label="Create a loan" className="transaction-header-add" href={"/loan/new" as Route}><Plus aria-hidden="true" size={20} /></Link></>} />
    <section className="loan-summary-hero"><p className="eyebrow">WHAT’S OUTSTANDING</p><h2>{formatMoney(data.data?.summary.due_loan ?? "0", currency)}</h2><div><span><small>Owed to you</small><strong>{formatMoney(data.data?.summary.total_loan_given ?? "0", currency)}</strong></span><span><small>You owe</small><strong>{formatMoney(data.data?.summary.total_loan_taken ?? "0", currency)}</strong></span></div></section>
    <div className="loan-search"><Search aria-hidden="true" size={17} /><input aria-label="Search loans" onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts or notes" value={search} /></div>
    <div aria-label="Loan direction" className="loan-filter-tabs">{(["all", "given", "taken"] as const).map((value) => <button aria-pressed={direction === value} key={value} onClick={() => setDirection(value)} type="button">{value === "given" ? "Owed to you" : value === "taken" ? "You owe" : "All"}</button>)}</div><div aria-label="Loan status" className="loan-filter-tabs loan-status-tabs">{(["all", "open", "settled"] as const).map((value) => <button aria-pressed={status === value} key={value} onClick={() => setStatus(value)} type="button">{value}</button>)}</div>
    {data.isPending ? <div aria-busy="true" aria-label="Loading loans" className="plan-loading" role="status"><div /><div /></div> : null}{data.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load loans</strong><p>{data.error.message}</p><button onClick={() => void data.refetch()} type="button">Try again</button></section> : null}
    {data.data ? <section className="loan-list-section"><div className="section-heading"><div><p className="eyebrow">RECORDS</p><h2>{status === "all" ? "Loan records" : `${status[0]!.toUpperCase()}${status.slice(1)} records`}</h2></div><span>{records.length}</span></div>{records.length ? <div className="loan-card-list">{records.map((record) => { const overdue = isOverdue(record); const percent = loanPercent(record); return <Link className={overdue ? "loan-card loan-card--overdue" : "loan-card"} href={`/loan/${record.id}` as Route} key={record.id}><span className={`category-icon ${record.direction === "given" ? "accent-green" : "accent-orange"}`}><HandCoins aria-hidden="true" size={19} /></span><div><strong>{loanPersonName(record, data.data.people)}</strong><span>{record.direction === "given" ? "Owes you" : "You owe"} · {record.repay_date ? `due ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${record.repay_date}T00:00:00`))}` : "no due date"}</span><ProgressBar accent={overdue ? "coral" : record.direction === "given" ? "green" : "orange"} label={`${loanPersonName(record, data.data.people)} settlement progress`} value={percent} /></div><span><strong>{formatMoney(record.outstanding_amount, record.currency)}</strong><small>{overdue ? "overdue" : `${Math.round(percent)}% settled`}</small></span><ChevronRight aria-hidden="true" size={16} /></Link>; })}</div> : <div className="plan-empty-card"><HandCoins aria-hidden="true" size={24} /><strong>No loan records</strong><p>Add a contact, then record money you gave or borrowed.</p><Link href={"/loan/new" as Route}>Create a loan <ChevronRight aria-hidden="true" size={15} /></Link></div>}</section> : null}
  </div></MobileShell>;
}
