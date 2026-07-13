"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/lib/auth/store";
import {
  getActiveAccounts,
  getDefaultAccount,
} from "@/lib/finance/accounts";
import {
  type Account,
  type Budget,
  listAccounts,
  listBudgets,
} from "@/lib/finance/api";
import { subscribeFinanceDataChanged } from "@/lib/finance/events";
import { monthKey } from "@/lib/finance/format";

export type HomeBalanceDisplay = {
  amount: string;
  currency: string;
  label: string;
  sourceType: "account" | "budget";
};

type BalanceSourceStatus = "idle" | "loading" | "success" | "error";

export function useHomeBalanceSource() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [status, setStatus] = useState<BalanceSourceStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadBalanceSources = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);

    const [accountResult, budgetResult] = await Promise.allSettled([
      listAccounts({ signal }),
      listBudgets(monthKey(), { signal }),
    ]);

    if (signal?.aborted) {
      return;
    }

    setAccounts(
      accountResult.status === "fulfilled" ? accountResult.value : [],
    );
    setBudgets(budgetResult.status === "fulfilled" ? budgetResult.value : []);

    if (
      accountResult.status === "rejected" ||
      budgetResult.status === "rejected"
    ) {
      setError("Some balance sources could not be loaded.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const controller = new AbortController();
    void loadBalanceSources(controller.signal);
    return () => controller.abort();
  }, [loadBalanceSources, pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }
    return subscribeFinanceDataChanged(() => {
      void loadBalanceSources();
    });
  }, [loadBalanceSources, pathname]);

  const balance = useMemo(
    () =>
      resolveHomeBalanceSource({
        accounts,
        budgets,
        sourceId: user?.home_balance_source_id,
        sourceType: user?.home_balance_source_type,
      }),
    [accounts, budgets, user?.home_balance_source_id, user?.home_balance_source_type],
  );

  return {
    balance,
    error,
    isLoading: status === "idle" || status === "loading",
    loadBalanceSources,
  };
}

export function resolveHomeBalanceSource({
  accounts,
  budgets,
  sourceId,
  sourceType,
}: {
  accounts: Account[];
  budgets: Budget[];
  sourceId?: string | null;
  sourceType?: "account" | "budget" | null;
}): HomeBalanceDisplay | null {
  const activeAccounts = getActiveAccounts(accounts);

  if (sourceType === "account" && sourceId) {
    const account = activeAccounts.find((item) => item.id === sourceId);
    if (account) {
      return accountBalanceDisplay(account);
    }
  }

  if (sourceType === "budget" && sourceId) {
    const budget = budgets.find(
      (item) => item.id === sourceId && !item.is_archived,
    );
    if (budget) {
      return budgetBalanceDisplay(budget);
    }
  }

  const fallbackAccount =
    getDefaultAccount(activeAccounts) ?? activeAccounts[0] ?? null;
  return fallbackAccount ? accountBalanceDisplay(fallbackAccount) : null;
}

function accountBalanceDisplay(account: Account): HomeBalanceDisplay {
  return {
    amount: account.current_balance,
    currency: account.currency,
    label: account.name,
    sourceType: "account",
  };
}

function budgetBalanceDisplay(budget: Budget): HomeBalanceDisplay {
  const name = budget.category_name ?? "Monthly Budget";
  const period = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${budget.period_start}T00:00:00Z`));

  return {
    amount: budget.progress.remaining_amount,
    currency: budget.currency,
    label: `${name} - ${period}`,
    sourceType: "budget",
  };
}
