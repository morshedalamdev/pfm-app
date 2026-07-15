import type { LucideIcon } from "lucide-react";

import { ProgressBar } from "@/components/ui/progress-bar";

type ExpenseRowProps = Readonly<{
  accent: "blue" | "orange" | "purple";
  amount: string;
  change: string;
  icon: LucideIcon;
  label: string;
  percent: number;
}>;

export function ExpenseRow({
  accent,
  amount,
  change,
  icon: Icon,
  label,
  percent,
}: ExpenseRowProps) {
  return (
    <article className="expense-row">
      <div className="expense-main">
        <span className={`category-icon accent-${accent}`}>
          <Icon aria-hidden="true" size={19} strokeWidth={2.2} />
        </span>
        <div>
          <strong>{label}</strong>
          <span>{percent}% of total</span>
        </div>
        <div className="expense-value">
          <strong>{amount}</strong>
          <span><b>{change}</b> vs last month</span>
        </div>
      </div>
      <ProgressBar accent={accent} label={`${label} spending share`} value={percent} />
    </article>
  );
}
