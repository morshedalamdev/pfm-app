"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Landmark, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getAccounts } from "@/lib/accounts/api";
import { isAccountActive } from "@/lib/accounts/utils";
import { getProfile, updateProfile } from "@/lib/settings/api";

export function SetupDashboard() {
  const profile = useQuery({ queryFn: getProfile, queryKey: ["setup", "profile"] });
  const accounts = useQuery({ queryFn: getAccounts, queryKey: ["accounts"] });
  const [currency, setCurrency] = useState("");
  const [currencySaved, setCurrencySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({ mutationFn: updateProfile });
  const activeAccounts = accounts.data?.items.filter(isAccountActive) ?? [];
  const selectedCurrency = currency || profile.data?.base_currency || "USD";

  async function saveCurrency(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!/^[A-Z]{3}$/.test(selectedCurrency)) { setError("Use a three-letter currency code."); return; }
    try { await update.mutateAsync({ base_currency: selectedCurrency }); setCurrencySaved(true); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save your currency."); }
  }

  return <MobileShell><main className="standard-page setup-page"><PageHeader backHref={null} title="Set up your money" />
    <section className="setup-hero"><p className="eyebrow">A CALMER START</p><h2>Two small steps, then you’re ready.</h2><p>We’ll set your home currency and add the account you use most. You can change both later.</p></section>
    {profile.isPending || accounts.isPending ? <div aria-busy="true" aria-label="Loading setup" className="accounts-skeleton" /> : null}
    {profile.isError || accounts.isError ? <section className="management-error" role="alert"><strong>Couldn’t prepare your setup</strong><button onClick={() => { void profile.refetch(); void accounts.refetch(); }} type="button">Try again</button></section> : null}
    {profile.data && accounts.data ? <div className="setup-steps"><section className="setup-step"><span className={`setup-step-number ${currencySaved || activeAccounts.length ? "setup-step-number--done" : ""}`}>{currencySaved || activeAccounts.length ? <Check aria-hidden="true" size={16} /> : "1"}</span><div><p className="eyebrow">YOUR HOME CURRENCY</p><h3>What currency do you use most?</h3><form className="setup-currency-form" onSubmit={(event) => void saveCurrency(event)}><input aria-label="Home currency" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={selectedCurrency} /><button disabled={update.isPending} type="submit">{update.isPending ? "Saving…" : currencySaved || activeAccounts.length ? "Saved" : "Save"}</button></form>{error ? <p className="form-error" role="alert">{error}</p> : null}</div></section>
      <section className="setup-step"><span className={`setup-step-number ${activeAccounts.length ? "setup-step-number--done" : ""}`}>{activeAccounts.length ? <Check aria-hidden="true" size={16} /> : "2"}</span><div><p className="eyebrow">YOUR FIRST ACCOUNT</p><h3>{activeAccounts.length ? `${activeAccounts[0]?.name} is ready` : "Where do you use money?"}</h3><p>{activeAccounts.length ? "You can add cards and other accounts whenever you need them." : "Add cash, a bank account, or a card. Start with the one you use most."}</p>{activeAccounts.length ? <Link className="setup-action" href={"/" as Route}><WalletCards aria-hidden="true" size={18} />Go to Home</Link> : <Link className="setup-action" href={`/accounts/new?next=/setup&currency=${encodeURIComponent(selectedCurrency)}` as Route}><Landmark aria-hidden="true" size={18} />Add your first account<ArrowRight aria-hidden="true" size={16} /></Link>}</div></section>
    </div> : null}
  </main></MobileShell>;
}
