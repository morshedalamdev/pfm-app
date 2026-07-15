import { CircleDot, Shirt } from "lucide-react";

import { ExpenseRow } from "@/components/finance/expense-row";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";

export default function ReportPage() {
  return (
    <MobileShell>
      <div className="standard-page">
        <PageHeader
          title="Report"
          trailing={<button className="month-pill month-pill--surface" type="button">November 2025 ⌄</button>}
        />
        <div aria-label="Report type" className="segmented-control" role="group">
          <button aria-pressed="true" type="button">Expenses</button>
          <button aria-pressed="false" type="button">Income</button>
        </div>
        <div className="section-heading section-heading--compact report-heading">
          <h2>Expenses report</h2>
          <span className="chart-switch" aria-label="Donut chart view">◔</span>
        </div>
        <div aria-label="Expense categories chart" className="donut-chart" role="img">
          <div><span>Total expenses</span><strong>$42,124<span>.67</span></strong></div>
        </div>
        <div className="list-heading"><span>All expenses</span><strong>$42,124.67</strong></div>
        <div className="stack-list">
          <ExpenseRow accent="blue" amount="$8,750.00" change="+12%" icon={CircleDot} label="Groceries" percent={31} />
          <ExpenseRow accent="orange" amount="$6,420.35" change="+6%" icon={Shirt} label="Clothing & Shoes" percent={25} />
        </div>
      </div>
    </MobileShell>
  );
}
