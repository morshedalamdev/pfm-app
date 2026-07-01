"use client";

import DateFilter from "@/components/filters/DateFilter";
import FilterMenu from "@/components/filters/FilterMenu";
import Header from "@/components/Header";
import TransactionItem from "@/components/items/TransactionItem";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  type Account,
  type Category,
  type Transaction,
  type TransactionTypeFilter,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";
import { CirclePlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

function displayTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayDate(value: string): string {
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupDate(value: string): string {
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TransactionPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState<Date | undefined>();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duration, setDuration] = useState("month");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<TransactionTypeFilter>("all");

  const dateRange = useMemo(() => {
    if (date) {
      const selected = date.toISOString().slice(0, 10);
      return { from: selected, to: selected };
    }

    const now = new Date();
    const from = new Date(now);
    if (duration === "day") {
      return {
        from: now.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      };
    }
    if (duration === "week") {
      from.setDate(now.getDate() - 7);
    } else {
      from.setMonth(now.getMonth() - 1);
    }
    return {
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }, [date, duration]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextAccounts, expenseCategories, incomeCategories, nextItems] =
        await Promise.all([
          listAccounts(),
          listCategories("expense"),
          listCategories("income"),
          listTransactions({
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
            limit: 100,
            search,
            type,
          }),
        ]);
      setAccounts(nextAccounts);
      setCategories([...expenseCategories, ...incomeCategories]);
      setTransactions(nextItems);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Transactions could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.from, dateRange.to, search, type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    transactions.forEach((transaction) => {
      const key = groupDate(transaction.transaction_at);
      groups.set(key, [...(groups.get(key) ?? []), transaction]);
    });
    return Array.from(groups.entries());
  }, [transactions]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteTransaction(id);
      setTransactions((items) => items.filter((item) => item.id !== id));
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : "Transaction could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Fragment>
      <Header homeBtn={true} title="Transaction">
        <Link href="/transaction/create">
          <Button variant="link" size="icon-sm">
            <CirclePlusIcon />
          </Button>
        </Link>
      </Header>
      <section className="p-3 flex items-center gap-1.5">
        <InputGroup className="rounded-full">
          <InputGroupAddon>
            <InputGroupText>
              <SearchIcon />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
          />
        </InputGroup>
        <DateFilter date={date} onDateChange={setDate} />
        <FilterMenu
          duration={duration}
          onDurationChange={setDuration}
          onTypeChange={(value) => setType(value as TransactionTypeFilter)}
          type={type}
        />
      </section>
      <section className="space-y-4 p-3 overflow-y-auto h-[calc(100%-6.5rem)]">
        {isLoading && (
          <p className="text-input text-sm">Loading transactions...</p>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadData()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && groupedTransactions.length === 0 && (
          <p className="text-input text-sm">No transactions found.</p>
        )}
        {!isLoading &&
          !error &&
          groupedTransactions.map(([label, items]) => (
            <div className="space-y-2" key={label}>
              <h4 className="text-input text-sm font-semibold">{label}</h4>
              {items.map((transaction) => {
                const category = transaction.category_id
                  ? categoryById.get(transaction.category_id)?.name
                  : undefined;
                const account = accountById.get(transaction.account_id)?.name;
                return (
                  <TransactionItem
                    key={transaction.id}
                    amount={Number(transaction.amount)}
                    category={category ?? account ?? "Transfer"}
                    date={displayTime(transaction.transaction_at)}
                    deleteError={
                      deletingId === transaction.id ? deleteError : null
                    }
                    editHref={`/transaction/${transaction.id}`}
                    isDeleting={deletingId === transaction.id}
                    note={transaction.description ?? account ?? ""}
                    onDelete={() => void handleDelete(transaction.id)}
                    recurringLabel="No"
                    transactionDate={displayDate(transaction.transaction_at)}
                    type={transaction.type}
                  />
                );
              })}
            </div>
          ))}
        {!isLoading && !error && transactions.length > 0 && (
          <p className="text-input text-xs">
            Showing {transactions.length} transactions in{" "}
            {formatMoney(
              transactions.reduce(
                (total, transaction) => total + Number(transaction.amount),
                0,
              ),
            )}{" "}
            activity.
          </p>
        )}
      </section>
    </Fragment>
  );
}
