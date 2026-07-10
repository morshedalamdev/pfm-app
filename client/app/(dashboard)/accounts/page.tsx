"use client";

import {
  type FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2Icon,
  CircleIcon,
  StarIcon,
  WalletCardsIcon,
} from "lucide-react";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { formatAccountMoney, isAccountActive } from "@/lib/finance/accounts";
import {
  createAccount,
  listAccounts,
  type Account,
  type AccountCreate,
} from "@/lib/finance/api";
import { decimalInput } from "@/lib/finance/format";

type AccountType = Account["type"];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  card: "Card",
  cash: "Cash",
  mobile_pay: "Mobile Pay",
  other: "Other",
  savings: "Savings",
  wallet: "Wallet",
};

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BDT", label: "BDT - Bangladeshi Taka" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese RMB" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const accountItems = await listAccounts({ signal });
      if (!signal?.aborted) {
        setAccounts(accountItems);
        setSelectedAccountId((current) =>
          current && accountItems.some((account) => account.id === current)
            ? current
            : null,
        );
      }
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Accounts could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  const accountSummary = useMemo(() => {
    const activeCount = accounts.filter(isAccountActive).length;
    return {
      activeCount,
      totalCount: accounts.length,
    };
  }, [accounts]);

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
      const account = await createAccount({
        currency: normalizedCurrency,
        name: normalizedName,
        opening_balance: decimalInput(normalizedBalance),
        type: "cash",
      } satisfies AccountCreate);
      setAccounts((current) => [account, ...current]);
      setSelectedAccountId(account.id);
      setAccountName("");
      setInitialBalance("");
      setCurrency("USD");
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
    <Fragment>
      <Header homeBtn={true} title="Accounts" />
      <section className="p-3 pb-0">
        <form
          className="space-y-3 rounded-lg border border-input/50 bg-secondary/70 p-3"
          onSubmit={handleCreateAccount}
        >
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              Create Account
            </h2>
          </div>
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
                Account currency
              </span>
              <NativeSelect
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
      <section className="p-3 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Account List
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-input/50 bg-secondary/70 p-3">
            <p className="text-xs font-bold text-input uppercase">Total</p>
            <p className="mt-1 text-2xl font-black">{accountSummary.totalCount}</p>
          </div>
          <div className="rounded-lg border border-input/50 bg-secondary/70 p-3">
            <p className="text-xs font-bold text-input uppercase">Active</p>
            <p className="mt-1 text-2xl font-black">{accountSummary.activeCount}</p>
          </div>
        </div>
      </section>
      <section className="space-y-3 p-3 pt-0">
        {isLoading ? (
          <AccountListSkeleton />
        ) : error ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadAccounts()}
            >
              Retry
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <p className="rounded-lg border border-input/50 bg-secondary/70 p-3 text-sm font-semibold text-input">
            No accounts found.
          </p>
        ) : (
          accounts.map((account) => (
            <AccountListItem
              key={account.id}
              account={account}
              isSelected={selectedAccountId === account.id}
              onSelect={() => setSelectedAccountId(account.id)}
            />
          ))
        )}
      </section>
    </Fragment>
  );
}

function AccountListItem({
  account,
  isSelected,
  onSelect,
}: {
  account: Account;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isActive = isAccountActive(account);
  const typeLabel =
    ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type;

  return (
    <button
      type="button"
      className={[
        "w-full rounded-lg border bg-secondary/70 p-3 text-left transition",
        isSelected ? "border-foreground shadow-sm" : "border-input/50",
        isActive ? "" : "opacity-70",
      ].join(" ")}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
            <WalletCardsIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{account.name}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-input">
              {typeLabel} - {account.currency}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-black">
            {formatAccountMoney(account)}
          </p>
          <p className="text-xs font-semibold text-input">
            Initial {formatAccountMoney(account, "opening_balance")}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill isActive={isActive} />
        {account.is_default ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-bold">
            <StarIcon className="size-3" />
            Default
          </span>
        ) : null}
      </div>
    </button>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  const Icon = isActive ? CheckCircle2Icon : CircleIcon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-bold">
      <Icon className="size-3" />
      {isActive ? "Active" : "Disabled"}
    </span>
  );
}

function AccountListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}
