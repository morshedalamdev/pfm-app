"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getDefaultAccount } from "@/lib/finance/accounts";
import { type Account, listAccounts } from "@/lib/finance/api";
import { subscribeFinanceDataChanged } from "@/lib/finance/events";

export type HomeBalanceDisplay = {
  amount: string;
  currency: string;
  label: string;
};

type BalanceSourceStatus = "idle" | "loading" | "success" | "error";

export function useHomeBalanceSource() {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<BalanceSourceStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadBalanceSources = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);

    try {
      const nextAccounts = await listAccounts({ signal });
      if (signal?.aborted) {
        return;
      }
      setAccounts(nextAccounts);
      setStatus("success");
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }
      setAccounts([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Default account could not be loaded.",
      );
      setStatus("error");
    }
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

  const balance = useMemo(() => resolveHomeDefaultAccount(accounts), [accounts]);

  return {
    balance,
    error,
    isLoading: status === "idle" || status === "loading",
    loadBalanceSources,
  };
}

export function resolveHomeDefaultAccount(
  accounts: Account[],
): HomeBalanceDisplay | null {
  const defaultAccount = getDefaultAccount(accounts);
  return defaultAccount ? accountBalanceDisplay(defaultAccount) : null;
}

function accountBalanceDisplay(account: Account): HomeBalanceDisplay {
  return {
    amount: account.current_balance,
    currency: account.currency,
    label: account.name,
  };
}
