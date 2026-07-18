import type { components } from "@generated/api-types";

export type CashFlowReport = components["schemas"]["CashFlowReportResponse"];
export type MonthlySummary = components["schemas"]["MonthlySummaryReportResponse"];
export type SpendingByCategoryReport = components["schemas"]["SpendingByCategoryReportResponse"];

export type ReportData = Readonly<{
  cashFlow: CashFlowReport;
  spending: SpendingByCategoryReport;
  summary: MonthlySummary;
}>;
