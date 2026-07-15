import type { LucideIcon } from "lucide-react";

type TransactionRowProps = Readonly<{
  accent: "blue" | "coral" | "orange" | "purple";
  amount: string;
  balance?: string;
  icon: LucideIcon;
  name: string;
  negative?: boolean;
  subtitle: string;
}>;

export function TransactionRow({
  accent,
  amount,
  balance,
  icon: Icon,
  name,
  negative = false,
  subtitle,
}: TransactionRowProps) {
  return (
    <article className="transaction-row">
      <span className={`category-icon accent-${accent}`}>
        <Icon aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      <div className="transaction-copy">
        <strong>{name}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="transaction-amount">
        <strong className={negative ? "amount-negative" : undefined}>{amount}</strong>
        {balance ? <span>{balance}</span> : null}
      </div>
    </article>
  );
}
