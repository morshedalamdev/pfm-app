"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { subscribeFinanceDataChanged } from "@/lib/finance/events";
import type { components } from "@/generated/api-types";

type AccountListResponse = components["schemas"]["AccountListResponse"];
type CategoryListResponse = components["schemas"]["CategoryListResponse"];
type DashboardPeriod = components["schemas"]["DashboardPeriod"];
type DashboardReportResponse = components["schemas"]["DashboardReportResponse"];
type ReportTransactionType = components["schemas"]["ReportTransactionType"];
type TransactionListResponse = components["schemas"]["TransactionListResponse"];
type TransactionResponse = components["schemas"]["TransactionResponse"];

export type DashboardChartBucket = {
  amount: number;
  isCurrent: boolean;
  label: string;
};

export type RecentDashboardTransaction = {
  amount: number;
  category: string;
  currency: string;
  date: string;
  id: string;
  note: string;
  transactionDate: string;
  type: string;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function useDashboardData() {
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [transactionType, setTransactionType] =
    useState<ReportTransactionType>("expense");
  const [report, setReport] = useState<DashboardReportResponse | null>(null);
  const [transactions, setTransactions] = useState<
    RecentDashboardTransaction[]
  >([]);
  const [reportStatus, setReportStatus] = useState<RequestState>("idle");
  const [transactionsStatus, setTransactionsStatus] =
    useState<RequestState>("idle");
  const [reportError, setReportError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );

  const loadReport = useCallback(async () => {
    setReportStatus("loading");
    setReportError(null);

    try {
      const nextReport = await apiGet<DashboardReportResponse>(
        "/api/v1/reports/dashboard",
        {
          params: {
            period,
            type: transactionType,
          },
        },
      );
      setReport(nextReport);
      setReportStatus("success");
    } catch (error) {
      setReportError(getErrorMessage(error));
      setReportStatus("error");
    }
  }, [period, transactionType]);

  const loadTransactions = useCallback(async () => {
    setTransactionsStatus("loading");
    setTransactionsError(null);

    try {
      const [transactionList, categoryList, accountList] = await Promise.all([
        apiGet<TransactionListResponse>("/api/v1/transactions", {
          params: {
            limit: 6,
          },
        }),
        apiGet<CategoryListResponse>("/api/v1/categories", {
          params: {
            limit: 100,
          },
        }),
        apiGet<AccountListResponse>("/api/v1/accounts", {
          params: {
            include_archived: false,
            limit: 100,
          },
        }),
      ]);

      const categoryNames = new Map(
        categoryList.items.map((category) => [category.id, category.name]),
      );
      const accountCurrencies = new Map(
        accountList.items.map((account) => [account.id, account.currency]),
      );

      setTransactions(
        transactionList.items.map((transaction) =>
          toRecentDashboardTransaction(
            transaction,
            categoryNames,
            accountCurrencies,
          ),
        ),
      );
      setTransactionsStatus("success");
    } catch (error) {
      setTransactionsError(getErrorMessage(error));
      setTransactionsStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(
    () =>
      subscribeFinanceDataChanged(() => {
        void loadReport();
        void loadTransactions();
      }),
    [loadReport, loadTransactions],
  );

  const chartBuckets = useMemo<DashboardChartBucket[]>(() => {
    return (
      report?.buckets.map((bucket) => ({
        amount: Number(bucket.amount),
        isCurrent: bucket.is_current,
        label: bucket.label,
      })) ?? []
    );
  }, [report]);

  return {
    chartBuckets,
    loadReport,
    loadTransactions,
    period,
    report,
    reportError,
    reportStatus,
    setPeriod,
    setTransactionType,
    transactionType,
    transactions,
    transactionsError,
    transactionsStatus,
  };
}

function toRecentDashboardTransaction(
  transaction: TransactionResponse,
  categoryNames: Map<string, string>,
  accountCurrencies: Map<string, string>,
): RecentDashboardTransaction {
  const transactionDate = new Date(transaction.transaction_at);
  const isTransfer = transaction.type.startsWith("transfer");
  const transferLabel =
    transaction.type === "transfer_credit" ? "Transfer In" : "Transfer Out";

  return {
    amount: Number(transaction.amount),
    category:
      (transaction.category_id && categoryNames.get(transaction.category_id)) ||
      (isTransfer ? transferLabel : "Other"),
    currency:
      accountCurrencies.get(transaction.account_id) ??
      transaction.currency ??
      "USD",
    date: transactionDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }),
    id: transaction.id,
    note: transaction.description ?? (isTransfer ? transferLabel : "No note"),
    transactionDate: transactionDate.toLocaleDateString("en-US"),
    type: transaction.type,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Could not load dashboard data. Please try again.";
}
