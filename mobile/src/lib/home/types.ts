import type { components } from "@generated/api-types";

export type DashboardReport = components["schemas"]["DashboardReportResponse"];
export type TransactionList = components["schemas"]["TransactionListResponse"];
export type Transaction = components["schemas"]["TransactionResponse"];

export type HomeData = Readonly<{
  dashboard: DashboardReport;
  transactions: TransactionList;
}>;
