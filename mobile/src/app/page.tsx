import { Bell, Coffee, ShoppingBag, WalletCards } from "lucide-react";

import { InsightBanner } from "@/components/finance/insight-banner";
import { MoneyStatCard } from "@/components/finance/money-stat-card";
import { TransactionRow } from "@/components/finance/transaction-row";
import { HomeHeader } from "@/components/layout/home-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function HomePage() {
  return (
    <MobileShell>
      <h1 className="sr-only">Home overview</h1>
      <HomeHeader
        actions={
          <>
            <ThemeToggle compact />
            <button aria-label="Notifications" className="icon-button" type="button">
              <Bell aria-hidden="true" size={19} strokeWidth={2.3} />
              <span className="notification-dot" />
            </button>
          </>
        }
      />

      <section className="home-sheet">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2>Your Money</h2>
          </div>
          <button className="soft-button" type="button">
            Details <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="money-grid">
          <MoneyStatCard
            accent="blue"
            icon={WalletCards}
            label="Income"
            value="$4,875.12"
          />
          <MoneyStatCard
            accent="coral"
            icon={ShoppingBag}
            label="Expenses"
            value="$8,145.78"
          />
        </div>

        <InsightBanner />

        <section aria-labelledby="transactions-heading" className="transaction-section">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h2 id="transactions-heading">Transactions</h2>
            </div>
            <button className="period-pill" type="button">
              This month
            </button>
          </div>

          <div className="transaction-date-row">
            <span>Monday, 12 January</span>
            <strong>$2,957.76</strong>
          </div>

          <div className="stack-list">
            <TransactionRow
              accent="purple"
              amount="−$354.25"
              balance="$4,245.21"
              icon={WalletCards}
              name="Cash, EUR"
              negative
              subtitle="Red card"
            />
            <TransactionRow
              accent="blue"
              amount="−$12.49"
              icon={Coffee}
              name="Cafes"
              negative
              subtitle="Vacation · Shared"
            />
          </div>
        </section>
      </section>
    </MobileShell>
  );
}
