import type { ReactNode } from "react";

type HomeHeaderProps = Readonly<{
  actions: ReactNode;
}>;

export function HomeHeader({ actions }: HomeHeaderProps) {
  return (
    <header className="balance-hero">
      <div className="top-bar">
        <div aria-label="Morshed Alam" className="avatar" role="img">
          MA
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
