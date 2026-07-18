import { getBackendJson } from "@/lib/api/client";
import { monthRange } from "@/lib/reports/utils";
import type { CashFlowReport, MonthlySummary, ReportData, SpendingByCategoryReport } from "@/lib/reports/types";

export async function getReportData(month: string): Promise<ReportData> {
  const { endAt, startAt } = monthRange(month);
  const range = new URLSearchParams({ date_from: startAt, date_to: endAt });
  const [summary, cashFlow, spending] = await Promise.all([
    getBackendJson<MonthlySummary>(`reports/monthly-summary?month=${month}`, "We couldn't load this month’s summary."),
    getBackendJson<CashFlowReport>(`reports/cash-flow?${range.toString()}&interval=day`, "We couldn't load this month’s cash flow."),
    getBackendJson<SpendingByCategoryReport>(`reports/spending-by-category?${range.toString()}`, "We couldn't load category spending."),
  ]);

  return { cashFlow, spending, summary };
}
