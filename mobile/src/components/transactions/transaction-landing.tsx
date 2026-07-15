"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronRight, ListFilter, Plus, Search, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getTransactionHistory } from "@/lib/transactions/api";
import { groupTransactions, isIncomingTransaction, isTransferTransaction, transactionDateRange, transactionSubtitle, transactionTimeLabel, transactionTitle } from "@/lib/transactions/history";
import type { TransactionPeriod, TransactionTypeFilter } from "@/lib/transactions/types";
import { formatMoney } from "@/lib/home/view-model";

const quickActions = [
  { href: "/transaction/new?type=expense", icon: ArrowUpRight, label: "Expense" },
  { href: "/transaction/new?type=income", icon: ArrowDownLeft, label: "Income" },
  { href: "/transaction/new?type=transfer", icon: ArrowLeftRight, label: "Transfer" },
] as const;

export function TransactionLanding() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [period, setPeriod] = useState<TransactionPeriod>("month");
  const [date, setDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const range = useMemo(() => transactionDateRange(period, date || undefined), [date, period]);
  const history = useQuery({
    queryFn: () => getTransactionHistory({ ...range, search: deferredSearch, type }),
    queryKey: ["transactions", range.dateFrom, range.dateTo, deferredSearch, type],
  });
  const groups = useMemo(() => groupTransactions(history.data?.transactions ?? []), [history.data?.transactions]);
  const activeFilterCount = Number(type !== "all") + Number(period !== "month" || Boolean(date));

  return <MobileShell><div className="standard-page transaction-history-page">
    <PageHeader backHref={null} title="Transactions" trailing={<Link aria-label="Add transaction" className="transaction-header-add" href={"/transaction/new" as Route}><Plus aria-hidden="true" size={20} /></Link>} />

    <section aria-label="Quick transaction actions" className="transaction-quick-actions">{quickActions.map(({ href, icon: Icon, label }) => <Link href={href as Route} key={label}><Icon aria-hidden="true" size={17} /><span>{label}</span></Link>)}</section>

    <div className="transaction-toolbar"><label className="transaction-search"><Search aria-hidden="true" size={18} /><span className="sr-only">Search transactions</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search notes or details" type="search" value={search} /></label><button aria-label={`Filter transactions${activeFilterCount ? `, ${activeFilterCount} active` : ""}`} className={activeFilterCount ? "transaction-filter-button transaction-filter-button--active" : "transaction-filter-button"} onClick={() => setFilterOpen(true)} type="button"><ListFilter aria-hidden="true" size={18} />{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button></div>

    <div className="transaction-history-heading"><div><p className="eyebrow">ACTIVITY</p><h2>{date ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${date}T00:00:00`)) : `Last ${period}`}</h2></div>{history.data ? <span>{history.data.transactions.length}</span> : null}</div>
    {history.isPending ? <div aria-busy="true" aria-label="Loading transactions" className="transaction-history-loading"><span /><span /><span /></div> : null}
    {history.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load transactions</strong><p>{history.error.message}</p><button onClick={() => void history.refetch()} type="button">Try again</button></section> : null}
    {history.data && !history.isError ? groups.length ? <div className="transaction-history-groups">{groups.map(([label, items]) => <section aria-labelledby={`group-${items[0]?.id}`} key={label}><h3 id={`group-${items[0]?.id}`}>{label}</h3><div>{items.map((transaction) => {
      const incoming = isIncomingTransaction(transaction); const transfer = isTransferTransaction(transaction);
      return <Link className="history-transaction-row" href={`/transaction/${transaction.id}` as Route} key={transaction.id}><span className={`category-icon ${transfer ? "accent-purple" : incoming ? "accent-blue" : "accent-coral"}`}>{transfer ? <ArrowLeftRight aria-hidden="true" size={18} /> : incoming ? <ArrowDownLeft aria-hidden="true" size={18} /> : <ArrowUpRight aria-hidden="true" size={18} />}</span><span className="history-transaction-copy"><strong>{transactionTitle(transaction, history.data.categories)}</strong><small>{transactionSubtitle(transaction, history.data.accounts, history.data.categories)}</small></span><span className="history-transaction-value"><strong className={incoming ? "amount-positive" : undefined}>{incoming ? "+" : "−"}{formatMoney(transaction.amount, transaction.currency)}</strong><small>{transactionTimeLabel(transaction.transaction_at)}</small></span><ChevronRight aria-hidden="true" size={15} /></Link>;
    })}</div></section>)}</div> : <section className="transaction-history-empty"><WalletCards aria-hidden="true" size={25} /><strong>No transactions found</strong><p>{search || activeFilterCount ? "Try a different search or filter." : "Your income, expenses, and transfers will appear here."}</p><Link href={"/transaction/new" as Route}>Add transaction</Link></section> : null}

    <Drawer onOpenChange={setFilterOpen} open={filterOpen}><DrawerContent><DrawerHeader><DrawerTitle>Filter transactions</DrawerTitle><DrawerDescription>Choose what activity you want to see.</DrawerDescription></DrawerHeader><div className="transaction-filter-sheet"><fieldset><legend>Type</legend><div>{(["all", "expense", "income", "transfer"] as const).map((option) => <button aria-pressed={type === option} key={option} onClick={() => setType(option)} type="button">{option}</button>)}</div></fieldset><fieldset><legend>Period</legend><div>{(["day", "week", "month"] as const).map((option) => <button aria-pressed={!date && period === option} key={option} onClick={() => { setDate(""); setPeriod(option); }} type="button">{option}</button>)}</div></fieldset><label><span><CalendarDays aria-hidden="true" size={16} />Specific date</span><input aria-label="Specific date" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label></div><DrawerFooter><DrawerClose asChild><button className="transaction-filter-apply" type="button">Show transactions</button></DrawerClose><button className="transaction-filter-reset" onClick={() => { setDate(""); setPeriod("month"); setType("all"); }} type="button">Reset filters</button></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
