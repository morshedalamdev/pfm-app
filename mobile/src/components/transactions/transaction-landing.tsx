"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";

const actions = [
  {
    accent: "coral",
    description: "Record money you spent",
    href: "/transaction/new?type=expense",
    icon: ArrowUpRight,
    label: "Expense",
  },
  {
    accent: "green",
    description: "Record money you received",
    href: "/transaction/new?type=income",
    icon: ArrowDownLeft,
    label: "Income",
  },
  {
    accent: "blue",
    description: "Move money between accounts",
    href: "/transaction/new?type=transfer",
    icon: ArrowLeftRight,
    label: "Transfer",
  },
] as const;

export function TransactionLanding() {
  return (
    <MobileShell>
      <div className="standard-page transaction-hub-page">
        <PageHeader backHref={null} title="Transactions" />
        <section className="transaction-hub-intro">
          <p className="eyebrow">QUICK ENTRY</p>
          <h2>What would you like to record?</h2>
          <p>Choose a money movement and we’ll prepare the right fields.</p>
        </section>

        <div className="transaction-action-grid">
          {actions.map(({ accent, description, href, icon: Icon, label }) => (
            <Link className="transaction-action-card" href={href as Route} key={label}>
              <span className={`category-icon accent-${accent}`}>
                <Icon aria-hidden="true" size={20} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight aria-hidden="true" size={18} />
            </Link>
          ))}
        </div>

        <section className="transaction-routine-card">
          <span className="category-icon accent-purple">
            <CalendarClock aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="eyebrow">ROUTINES</p>
            <h2>Recurring transactions</h2>
            <p>Review scheduled income and expenses in one place.</p>
          </div>
          <Link className="soft-button" href={"/transaction/recurring" as Route}>
            Open
          </Link>
        </section>
      </div>
    </MobileShell>
  );
}
