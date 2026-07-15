"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/lib/auth/store";

type HomeHeaderProps = Readonly<{
  actions: ReactNode;
}>;

export function HomeHeader({ actions }: HomeHeaderProps) {
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
        <button className="month-pill" type="button">
          November 2025 <span aria-hidden="true">⌄</span>
        </button>
        <div className="header-actions">{actions}</div>
      </div>

      <div className="balance-copy">
        <p>Current Balance</p>
        <strong>$87,457<span>.85</span></strong>
        <small>+$784 from last week</small>
      </div>
    </header>
  );
}
