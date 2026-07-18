import { Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MoneyStatCardProps = Readonly<{
  accent: "blue" | "coral";
  icon: LucideIcon;
  label: string;
  value: string;
}>;

export function MoneyStatCard({
  accent,
  icon: Icon,
  label,
  value,
}: MoneyStatCardProps) {
  return (
    <article className="money-card">
      <span className={`category-icon accent-${accent}`}>
        <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
      </span>
      <p>
        {label} <Info aria-hidden="true" size={14} />
      </p>
      <strong>{value}</strong>
    </article>
  );
}
