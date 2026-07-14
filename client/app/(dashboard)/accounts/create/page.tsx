"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ApiError } from "@/lib/api/errors";
import {
  ACCOUNT_TYPE_OPTIONS,
  type CanonicalAccountType,
} from "@/lib/finance/accountTypes";
import { createAccount, type AccountCreate } from "@/lib/finance/api";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { decimalInput } from "@/lib/finance/format";

export default function CreateAccountPage() {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] =
    useState<CanonicalAccountType>("debit_card");
  const [currency, setCurrency] = useState("USD");
  const [formError, setFormError] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = accountName.trim();
    const normalizedCurrency = currency.trim().toUpperCase();
    const normalizedBalance = initialBalance.trim();
    const balanceAmount = Number(normalizedBalance);

    if (!normalizedName) {
      setFormError("Account name is required.");
      return;
    }
    if (!normalizedCurrency) {
      setFormError("Account currency is required.");
      return;
    }
    if (!normalizedBalance || !Number.isFinite(balanceAmount) || balanceAmount < 0) {
      setFormError("Initial budget / balance must be a valid amount.");
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await createAccount({
        currency: normalizedCurrency,
        name: normalizedName,
        opening_balance: decimalInput(normalizedBalance),
        type: accountType,
      } satisfies AccountCreate);
      router.push("/accounts");
    } catch (createError) {
      setFormError(
        createError instanceof ApiError
          ? createError.message
          : "Account could not be created.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <Header homeBtn={true} title="Create Account">
        <BackBtn />
      </Header>
      <section className="p-3">
        <form
          className="space-y-3 rounded-lg border border-input/50 bg-secondary/70 p-3"
          onSubmit={handleCreateAccount}
        >
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-input uppercase">
                Account name
              </span>
              <Input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Account name"
                disabled={isSaving}
                aria-invalid={Boolean(formError && !accountName.trim())}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-input uppercase">
                Account Type
              </span>
              <NativeSelect
                aria-label="Account Type"
                className="w-full border border-input bg-transparent"
                value={accountType}
                onChange={(event) =>
                  setAccountType(event.target.value as CanonicalAccountType)
                }
                disabled={isSaving}
              >
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-input uppercase">
                Account currency
              </span>
              <NativeSelect
                aria-label="Account currency"
                className="w-full border border-input bg-transparent"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                disabled={isSaving}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-input uppercase">
                Initial budget / balance
              </span>
              <Input
                value={initialBalance}
                onChange={(event) => setInitialBalance(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                disabled={isSaving}
                aria-invalid={Boolean(formError && !initialBalance.trim())}
              />
            </label>
          </div>
          {formError ? (
            <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Account"}
          </Button>
        </form>
      </section>
    </main>
  );
}
