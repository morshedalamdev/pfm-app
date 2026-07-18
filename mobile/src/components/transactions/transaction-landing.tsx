"use client";

import { type InfiniteData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronRight, ListFilter, Plus, Search, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { formatMoney } from "@/lib/home/view-model";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getTransactionHistoryOptions, listTransactions } from "@/lib/transactions/api";
import { groupTransactions, isIncomingTransaction, isTransferTransaction, transactionDateRange, transactionSubtitle, transactionTimeLabel, transactionTitle } from "@/lib/transactions/history";
import type { Transaction, TransactionList, TransactionPeriod, TransactionTypeFilter } from "@/lib/transactions/types";

export function TransactionLanding() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [period, setPeriod] = useState<TransactionPeriod>("month");
  const [date, setDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const range = useMemo(() => transactionDateRange(period, date || undefined), [date, period]);
  const filters = useMemo(() => ({ ...range, search: deferredSearch, type }), [deferredSearch, range, type]);
  const options = useQuery({ queryFn: getTransactionHistoryOptions, queryKey: ["transaction-options"] });
  const history = useInfiniteQuery<TransactionList, Error, InfiniteData<TransactionList>, readonly ["transactions", typeof filters], string | null>({
    getNextPageParam: (page) => page.has_more ? page.next_cursor ?? undefined : undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listTransactions({ ...filters, cursor: pageParam ?? undefined }),
    queryKey: ["transactions", filters],
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = history;
  const transactions = useMemo(() => {
    const byId = new Map<string, Transaction>();
    history.data?.pages.forEach((page) => page.items.forEach((transaction) => byId.set(transaction.id, transaction)));
    return [...byId.values()];
  }, [history.data]);
  const groups = useMemo(() => groupTransactions(transactions), [transactions]);
  const activeFilterCount = Number(type !== "all") + Number(period !== "month" || Boolean(date));
  const isInitialLoading = options.isPending || history.isPending;
  const isInitialError = options.isError || history.isError;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void fetchNextPage();
    }, { rootMargin: "0px 0px 160px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function retry() {
    void options.refetch();
    void history.refetch();
  }

  return <MobileShell><div className="standard-page transaction-history-page">
    <PageHeader backHref={null} title="Transactions" trailing={<Link aria-label="Add transaction" className="transaction-header-add" href={"/transaction/new" as Route}><Plus aria-hidden="true" size={20} /></Link>} />

    <div className="transaction-toolbar"><label className="transaction-search"><Search aria-hidden="true" size={18} /><span className="sr-only">Search transactions</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search notes or details" type="search" value={search} /></label><button aria-label={`Filter transactions${activeFilterCount ? `, ${activeFilterCount} active` : ""}`} className={activeFilterCount ? "transaction-filter-button transaction-filter-button--active" : "transaction-filter-button"} onClick={() => setFilterOpen(true)} type="button"><ListFilter aria-hidden="true" size={18} />{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button></div>

    <div className="transaction-history-heading"><div><p className="eyebrow">ACTIVITY</p><h2>{date ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${date}T00:00:00`)) : `Last ${period}`}</h2></div>{history.data ? <span>{history.hasNextPage ? `${transactions.length}+` : transactions.length}</span> : null}</div>
    {isInitialLoading ? <div aria-busy="true" aria-label="Loading transactions" className="transaction-history-loading" role="status"><span /><span /><span /></div> : null}
    {isInitialError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load transactions</strong><p>{options.error?.message ?? history.error?.message}</p><button onClick={retry} type="button">Try again</button></section> : null}
    {options.data && history.data && !isInitialError ? groups.length ? <><div className="transaction-history-groups">{groups.map(([label, items]) => <section aria-labelledby={`group-${items[0]?.id}`} key={label}><h3 id={`group-${items[0]?.id}`}>{label}</h3><div>{items.map((transaction) => {
      const incoming = isIncomingTransaction(transaction); const transfer = isTransferTransaction(transaction);
      return <Link className="history-transaction-row" href={`/transaction/${transaction.id}` as Route} key={transaction.id}><span className={`category-icon ${transfer ? "accent-purple" : incoming ? "accent-blue" : "accent-coral"}`}>{transfer ? <ArrowLeftRight aria-hidden="true" size={18} /> : incoming ? <ArrowDownLeft aria-hidden="true" size={18} /> : <ArrowUpRight aria-hidden="true" size={18} />}</span><span className="history-transaction-copy"><strong>{transactionTitle(transaction, options.data.categories)}</strong><small>{transactionSubtitle(transaction, options.data.accounts, options.data.categories)}</small></span><span className="history-transaction-value"><strong className={incoming ? "amount-positive" : undefined}>{incoming ? "+" : "−"}{formatMoney(transaction.amount, transaction.currency)}</strong><small>{transactionTimeLabel(transaction.transaction_at)}</small></span><ChevronRight aria-hidden="true" size={15} /></Link>;
    })}</div></section>)}</div>{history.hasNextPage ? <div aria-live="polite" className="transaction-history-more" data-testid="transaction-load-more-sentinel" ref={loadMoreRef} role="status">{history.isFetchingNextPage ? "Loading more transactions…" : "Scroll to load more transactions"}</div> : <p className="transaction-history-end">All transactions loaded</p>}{history.isFetchNextPageError ? <section className="transaction-history-error transaction-history-error--more" role="alert"><strong>Couldn’t load more transactions</strong><button onClick={() => void fetchNextPage()} type="button">Try again</button></section> : null}</> : <section className="transaction-history-empty"><WalletCards aria-hidden="true" size={25} /><strong>No transactions found</strong><p>{search || activeFilterCount ? "Try a different search or filter." : "Your income, expenses, and transfers will appear here."}</p><Link href={"/transaction/new" as Route}>Add transaction</Link></section> : null}

    <Drawer onOpenChange={setFilterOpen} open={filterOpen}><DrawerContent><DrawerHeader><DrawerTitle>Filter transactions</DrawerTitle><DrawerDescription>Choose what activity you want to see.</DrawerDescription></DrawerHeader><div className="transaction-filter-sheet"><fieldset><legend>Type</legend><div>{(["all", "expense", "income", "transfer"] as const).map((option) => <button aria-pressed={type === option} key={option} onClick={() => setType(option)} type="button">{option}</button>)}</div></fieldset><fieldset><legend>Period</legend><div>{(["day", "week", "month"] as const).map((option) => <button aria-pressed={!date && period === option} key={option} onClick={() => { setDate(""); setPeriod(option); }} type="button">{option}</button>)}</div></fieldset><label><span><CalendarDays aria-hidden="true" size={16} />Specific date</span><input aria-label="Specific date" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label></div><DrawerFooter><DrawerClose asChild><button className="transaction-filter-apply" type="button">Show transactions</button></DrawerClose><button className="transaction-filter-reset" onClick={() => { setDate(""); setPeriod("month"); setType("all"); }} type="button">Reset filters</button></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
