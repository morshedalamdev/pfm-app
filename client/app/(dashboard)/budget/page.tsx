"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { CheckIcon, ChevronDownIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import BudgetItem from "@/components/items/BudgetItem";
import {
  deleteBudget,
  listBudgets,
  type Budget,
} from "@/lib/finance/api";
import { useAuthStore } from "@/lib/auth/store";
import { formatMoney, formatPercent, monthKey } from "@/lib/finance/format";

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 18 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = monthKey(date);
    return {
      label: date.toLocaleDateString([], { month: "short", year: "numeric" }),
      value,
    };
  });
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(monthKey());
  const [open, setOpen] = useState(false);
  const userCurrency = useAuthStore((state) => state.user?.base_currency ?? "USD");
  const months = useMemo(monthOptions, []);

  const loadBudgets = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const budgetItems = await listBudgets(month, { signal });
      if (!signal?.aborted) {
        setBudgets(budgetItems);
      }
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Budgets could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [month]);

  useEffect(() => {
    const controller = new AbortController();
    void loadBudgets(controller.signal);
    return () => controller.abort();
  }, [loadBudgets]);

  const totals = useMemo(() => {
    const limit = budgets.reduce(
      (total, budget) => total + Number(budget.limit_amount),
      0,
    );
    const spent = budgets.reduce(
      (total, budget) => total + Number(budget.progress.spent_amount),
      0,
    );
    const remaining = limit - spent;
    return {
      limit,
      percent: limit > 0 ? (spent / limit) * 100 : 0,
      remaining,
      spent,
    };
  }, [budgets]);

  async function handleDelete(id: string) {
    try {
      await deleteBudget(id);
      setBudgets((items) => items.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Budget could not be deleted.",
      );
    }
  }

  const activeMonthLabel =
    months.find((option) => option.value === month)?.label ?? month;

  return (
    <Fragment>
      <Header homeBtn={true} title="Budget">
        <Link href="/budget/setup">
          <Button variant="link" size="icon-sm">
            <SettingsIcon />
          </Button>
        </Link>
      </Header>
      <section className="p-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              {activeMonthLabel}
              <ChevronDownIcon className="text-input" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Command>
              <CommandInput placeholder="Search Month" />
              <CommandGroup>
                {months.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    className="flex items-center justify-between"
                    onSelect={(currentValue) => {
                      setMonth(currentValue);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <CheckIcon
                      className={
                        month === option.value ? "opacity-100" : "opacity-0"
                      }
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </section>
      <section className="p-3 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Monthly Budget
        </h2>
        <h3 className="text-5xl font-bold">
          {formatMoney(totals.limit, userCurrency)}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3">
          <div>
            <span className="text-input">Spent</span>
            <h4 className="font-bold text-2xl">
              {formatMoney(totals.spent, userCurrency)}
            </h4>
          </div>
          <div>
            <span className="text-input">Remaining</span>
            <h4 className="font-bold text-2xl">
              {formatMoney(totals.remaining, userCurrency)}
            </h4>
          </div>
          <Progress value={Math.min(totals.percent, 100)} className="h-2" />
          <span>{formatPercent(totals.percent)} used</span>
        </div>
      </section>
      <section className="space-y-3 p-3 h-[calc(100%-320px)] overflow-y-auto">
        {isLoading && <p className="text-input text-sm">Loading budgets...</p>}
        {error && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadBudgets()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && budgets.length === 0 && (
          <p className="text-input text-sm">No budgets found for this month.</p>
        )}
        {!isLoading &&
          !error &&
          budgets.map((budget) => (
            <BudgetItem
              key={budget.id}
              category={budget.category_name ?? "General"}
              limit={formatMoney(budget.limit_amount, budget.currency)}
              onDelete={() => void handleDelete(budget.id)}
              percentUsed={Number(budget.progress.percent_used)}
              remaining={formatMoney(
                budget.progress.remaining_amount,
                budget.currency,
              )}
              spent={formatMoney(
                budget.progress.spent_amount,
                budget.currency,
              )}
              status={budget.progress.status}
            />
          ))}
      </section>
    </Fragment>
  );
}
