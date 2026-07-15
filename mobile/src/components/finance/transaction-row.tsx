import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

type TransactionRowProps = Readonly<{
  accent: "blue" | "coral" | "orange" | "purple";
  amount: string;
  balance?: string;
  icon: LucideIcon;
  href?: Route;
  name: string;
  negative?: boolean;
  subtitle: string;
}>;

export function TransactionRow({
  accent,
  amount,
  balance,
  icon: Icon,
  href,
  name,
  negative = false,
  subtitle,
}: TransactionRowProps) {
  const content = (
    <>
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
    </>
  );

  return href ? <Link className="transaction-row" href={href}>{content}</Link> : <article className="transaction-row">{content}</article>;
}
