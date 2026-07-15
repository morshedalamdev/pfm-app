"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createAccount } from "@/lib/accounts/api";
import { accountTypes } from "@/lib/accounts/types";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

export function AccountForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof accountTypes)[number][0]>("bank_account");
  const [currency, setCurrency] = useState(searchParams.get("currency")?.toUpperCase() || "USD");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({ mutationFn: createAccount });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !/^[-+]?\d+(\.\d{1,4})?$/.test(openingBalance) || !/^[A-Z]{3}$/.test(currency)) {
      setError("Enter a name, a valid opening balance, and a three-letter currency code.");
      return;
    }
    try {
      const account = await create.mutateAsync({ currency, name: name.trim(), opening_balance: openingBalance, type });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      const next = getSafeNextPath(searchParams.get("next"));
      router.replace((next === "/" ? `/accounts/${account.id}` : next) as Route);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add this account.");
    }
  }

  return (
    <MobileShell>
      <main className="standard-page account-form-page">
        <PageHeader backHref={"/accounts" as Route} title="Add account" trailing={<ThemeToggle compact />} />
        <section className="account-form-intro"><p className="eyebrow">FIRST, A MONEY SOURCE</p><h2>Where do you use money?</h2><p>Start with the account, card, or cash you use most. You can add the rest later.</p></section>
        <form className="management-form account-form" noValidate onSubmit={(event) => void submit(event)}>
          <label><span>Account name</span><input autoFocus autoComplete="off" onChange={(event) => setName(event.target.value)} placeholder="Everyday checking" value={name} /></label>
          <label><span>Type</span><select onChange={(event) => setType(event.target.value as typeof type)} value={type}>{accountTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="management-form-grid"><label><span>Currency</span><input aria-label="Currency" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label><label><span>Opening balance</span><input aria-label="Opening balance" inputMode="decimal" onChange={(event) => setOpeningBalance(event.target.value)} placeholder="0.00" value={openingBalance} /></label></div>
          <small>Your opening balance is the amount in this account right now.</small>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="management-submit" disabled={create.isPending} type="submit">{create.isPending ? "Adding account…" : "Add account"}</button>
        </form>
      </main>
    </MobileShell>
  );
}
