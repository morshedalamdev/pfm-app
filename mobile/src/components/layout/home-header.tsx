"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/lib/auth/store";

type HomeHeaderProps = Readonly<{
  actions: ReactNode;
  balance?: string;
  change?: string;
  monthLabel: string;
}>;

export function HomeHeader({ actions, balance, change, monthLabel }: HomeHeaderProps) {
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
        <div aria-label={displayName} className="avatar" role="img">
          {initials}
          <span className="avatar-badge" aria-hidden="true">✦</span>
        </div>
        <span className="month-pill">{monthLabel}</span>
        <div className="header-actions">{actions}</div>
      </div>

      <div className="balance-copy">
        <p>Current Balance</p>
        {balance ? <strong>{balance}</strong> : <span aria-label="Loading current balance" className="balance-skeleton" />}
        {change ? <small>{change}</small> : null}
      </div>
    </header>
  );
}
