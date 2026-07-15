import { Car, GraduationCap, HeartPulse, Plus, Umbrella } from "lucide-react";

import { PlanCard } from "@/components/finance/plan-card";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";

const budgets = [
  { accent: "coral" as const, amount: "$2,500 of $7,500", icon: Car, label: "Save for a Car", value: 55 },
  { accent: "purple" as const, amount: "$500 of $2,500", icon: GraduationCap, label: "Save for Education", value: 25 },
  { accent: "blue" as const, amount: "$750 of $5,000", icon: Umbrella, label: "Vacation fund", value: 65 },
  { accent: "green" as const, amount: "$1,200 of $8,000", icon: HeartPulse, label: "Health savings", value: 45 },
];

export default function PlanPage() {
  return (
    <MobileShell>
      <div className="standard-page">
        <PageHeader
          title="My Plan"
          trailing={<button aria-label="Create a plan" className="icon-button icon-button--dark" type="button"><Plus aria-hidden="true" size={20} /></button>}
        />
        <div className="section-heading section-heading--compact"><h2>Goals</h2><button className="text-button" type="button">View all</button></div>
        <PlanCard />
        <div className="section-heading section-heading--compact budget-heading"><h2>Budgets</h2><button className="text-button" type="button">View all</button></div>
        <div className="stack-list">
          {budgets.map(({ accent, amount, icon: Icon, label, value }) => (
            <article className="budget-row" key={label}>
              <span className={`category-icon accent-${accent}`}><Icon aria-hidden="true" size={20} /></span>
              <div><strong>{label}</strong><span>{amount}</span><ProgressBar accent={accent} label={`${label} progress`} value={value} /></div>
              <strong className={`budget-percent accent-text-${accent}`}>{value}%</strong>
            </article>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
