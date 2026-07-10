"use client";

import { type FormEvent, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  type Account,
  type AccountCreate,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";
import { useAuthStore } from "@/lib/auth/store";

type AccountType = AccountCreate["type"];

const ACCOUNT_TYPE_OPTIONS: Array<{ label: string; value: AccountType }> = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "Mobile Pay", value: "mobile_pay" },
  { label: "Bank", value: "bank" },
  { label: "Wallet", value: "wallet" },
  { label: "Savings", value: "savings" },
  { label: "Other", value: "other" },
];

const ACCOUNT_TYPE_LABELS = Object.fromEntries(
  ACCOUNT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<AccountType, string>;

export function AccountBoard() {
  const userCurrency = useAuthStore((state) => state.user?.base_currency ?? "USD");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("cash");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const nextAccounts = await listAccounts();
        if (isMounted) {
          setAccounts(nextAccounts);
        }
      } catch (err) {
        if (isMounted) {
          setError(readErrorMessage(err, "Unable to load accounts."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = accountName.trim();
    if (!normalizedName) {
      setError("Account name is required.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const account = await createAccount({
        currency: userCurrency,
        name: normalizedName,
        opening_balance: "0",
        type: accountType,
      });
      setAccounts((current) => [account, ...current]);
      setAccountName("");
      setAccountType("cash");
      setIsAdding(false);
    } catch (err) {
      setError(readErrorMessage(err, "Unable to add account."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    setError(null);
    setDeletingId(account.id);
    try {
      await deleteAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
    } catch (err) {
      setError(readErrorMessage(err, "Unable to remove account."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black tracking-wide text-input uppercase">
          Account
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="w-6"
          onClick={() => {
            setError(null);
            setIsAdding((current) => !current);
          }}
          aria-label={isAdding ? "Close account form" : "Add account"}
          title={isAdding ? "Close account form" : "Add account"}
        >
          {isAdding ? <XIcon /> : <PlusIcon />}
        </Button>
      </div>

      {isAdding ? (
        <form onSubmit={handleCreate} className="space-y-2">
          <Input
            aria-label="Account name"
            placeholder="Account name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            disabled={isSaving}
          />
          <NativeSelect
            aria-label="Account type"
            className="w-full border border-input"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value as AccountType)}
            disabled={isSaving}
          >
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Account"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm font-semibold text-input">No accounts yet.</p>
      ) : (
        <div>
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-2 border-b border-input/50 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{account.name}</p>
                <p className="truncate text-xs font-semibold text-input">
                  {ACCOUNT_TYPE_LABELS[account.type as AccountType] ??
                    account.type}{" "}
                  - {formatMoney(account.opening_balance, account.currency)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="w-6"
                onClick={() => void handleDelete(account)}
                disabled={deletingId === account.id}
                aria-label={`Remove ${account.name}`}
                title={`Remove ${account.name}`}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
