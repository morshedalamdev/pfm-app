import type { components } from "@/generated/api-types";
import { apiGet } from "@/lib/api/client";

export type CashFlowReport = components["schemas"]["CashFlowReportResponse"];
export type MonthlySummary =
  components["schemas"]["MonthlySummaryReportResponse"];
export type SpendingByCategoryReport =
  components["schemas"]["SpendingByCategoryReportResponse"];

export function getMonthlySummary(month: string) {
  return apiGet<MonthlySummary>("/api/v1/reports/monthly-summary", {
    params: { month },
  });
}

export function getCashFlowReport(params: {
  dateFrom: string;
  dateTo: string;
  interval?: "day" | "week" | "month";
}) {
  return apiGet<CashFlowReport>("/api/v1/reports/cash-flow", {
    params: {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      interval: params.interval ?? "day",
    },
  });
}

export function getSpendingByCategoryReport(params: {
  dateFrom: string;
  dateTo: string;
}) {
  return apiGet<SpendingByCategoryReport>(
    "/api/v1/reports/spending-by-category",
    {
      params: {
        date_from: params.dateFrom,
        date_to: params.dateTo,
      },
    },
  );
}
