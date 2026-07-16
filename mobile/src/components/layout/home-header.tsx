"use client";

import Link from "next/link";

import { HeaderMenu } from "@/components/navigation/header-menu";
import { useAuthStore } from "@/lib/auth/store";

type HomeHeaderProps = Readonly<{
  balance?: string;
  change?: string;
  monthLabel: string;
}>;

export function HomeHeader({ balance, change, monthLabel }: HomeHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.full_name || user?.email || "Morshed Alam";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PF";

  return (
    <header className="balance-hero">
      <div className="top-bar">
        <Link aria-label="Open profile" className="avatar" href="/profile">
          {initials}
          <span className="avatar-badge" aria-hidden="true">✦</span>
        </Link>
        <span className="month-pill">{monthLabel}</span>
        <div className="header-actions"><HeaderMenu /></div>
      </div>

      <div className="balance-copy">
        <p>Current Balance</p>
        {balance ? <strong>{balance}</strong> : <span aria-label="Loading current balance" className="balance-skeleton" />}
        {change ? <small>{change}</small> : null}
      </div>
    </header>
  );
}
