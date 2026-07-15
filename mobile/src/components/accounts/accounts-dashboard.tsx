"use client";

import { useQuery } from "@tanstack/react-query";
import { Landmark, Plus, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getAccounts } from "@/lib/accounts/api";
import { isAccountActive } from "@/lib/accounts/utils";
import { formatMoney } from "@/lib/home/view-model";

export function AccountsDashboard() {
  const accounts = useQuery({ queryFn: getAccounts, queryKey: ["accounts"] });
  const visible = accounts.data?.items.filter((account) => !account.is_archived) ?? [];
  const active = visible.filter(isAccountActive);

  return (
    <MobileShell>
      <main className="standard-page accounts-page">
        <PageHeader backHref={null} title="Accounts" trailing={<ThemeToggle compact />} />
        <section className="accounts-hero">
          <p className="eyebrow">MONEY SOURCES</p>
          <h2>See where your money lives.</h2>
          <p>{active.length ? `${active.length} active ${active.length === 1 ? "account" : "accounts"} ready to use.` : "Add an account to start tracking your money."}</p>
          <Link className="accounts-add-button" href={"/accounts/new" as Route}><Plus aria-hidden="true" size={18} />Add account</Link>
        </section>

        {accounts.isPending ? <div aria-busy="true" aria-label="Loading accounts" className="accounts-skeleton" /> : null}
        {accounts.isError ? <section className="management-error" role="alert"><strong>Couldn’t load your accounts</strong><button onClick={() => void accounts.refetch()} type="button">Try again</button></section> : null}
        {accounts.data ? (
          <section aria-label="Your accounts" className="accounts-list">
            {visible.length ? visible.map((account) => (
              <Link className="account-card" href={`/accounts/${account.id}` as Route} key={account.id}>
                <span className={`account-card-icon ${account.is_disabled ? "account-card-icon--muted" : ""}`}><Landmark aria-hidden="true" size={21} /></span>
                <span className="account-card-copy"><strong>{account.name}</strong><small>{account.type.replaceAll("_", " ")}{account.is_disabled ? " · disabled" : ""}</small></span>
                <span className="account-card-balance"><strong>{formatMoney(account.current_balance, account.currency)}</strong>{account.is_default ? <small>Default</small> : null}</span>
              </Link>
            )) : <div className="accounts-empty"><WalletCards aria-hidden="true" size={25} /><strong>Your first account belongs here</strong><span>Use cash, a bank account, or a card—whatever you spend from first.</span><Link href={"/accounts/new" as Route}>Add your first account</Link></div>}
          </section>
        ) : null}
      </main>
    </MobileShell>
  );
}
