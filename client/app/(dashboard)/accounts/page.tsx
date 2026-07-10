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
  BanIcon,
  CheckCircle2Icon,
  CircleIcon,
  StarIcon,
  Trash2Icon,
  WalletCardsIcon,
} from "lucide-react";

import Header from "@/components/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import {
  canDeleteAccountFromEligibility,
  deleteAccountWhenSafe,
  disableAccountInList,
  formatAccountMoney,
  isAccountActive,
} from "@/lib/finance/accounts";
import {
  canDeleteAccount,
  createAccount,
  disableAccount,
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
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disablingAccountId, setDisablingAccountId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        setDetailAccountId((current) =>
          current && accountItems.some((account) => account.id === current)
            ? current
            : null,
        );
        setDeleteError(null);
        setDeleteDialogOpen(false);
        setDisableError(null);
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

  const detailAccount =
    accounts.find((account) => account.id === detailAccountId) ?? null;

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
      setDeleteError(null);
      setDisableError(null);
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

  async function handlePrepareDeleteAccount(account: Account) {
    setDeleteError(null);
    setIsCheckingDelete(true);
    try {
      const eligibility = await canDeleteAccount(account.id);
      if (!canDeleteAccountFromEligibility(eligibility)) {
        setDeleteError(deleteRestrictionMessage(eligibility.reasons));
        return;
      }
      setDeleteDialogOpen(true);
    } catch (deleteAccountError) {
      setDeleteError(
        deleteAccountError instanceof ApiError
          ? deleteAccountError.message
          : "Account delete eligibility could not be checked.",
      );
    } finally {
      setIsCheckingDelete(false);
    }
  }

  async function handleDeleteAccount(account: Account) {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const deletedAccount = await deleteAccountWhenSafe(account.id);
      setAccounts((current) =>
        current.filter((currentAccount) => currentAccount.id !== deletedAccount.id),
      );
      setDeleteDialogOpen(false);
      setDetailAccountId(null);
      setSelectedAccountId(null);
    } catch (deleteAccountError) {
      setDeleteError(
        deleteAccountError instanceof ApiError
          ? deleteAccountError.message
          : deleteAccountError instanceof Error
            ? deleteAccountError.message
            : "Account could not be deleted.",
      );
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDisableAccount(account: Account) {
    if (!isAccountActive(account)) {
      return;
    }

    setDisableError(null);
    setDisablingAccountId(account.id);
    try {
      const disabledAccount = await disableAccount(account.id);
      setAccounts((current) =>
        disableAccountInList(
          current.map((currentAccount) =>
            currentAccount.id === disabledAccount.id
              ? disabledAccount
              : currentAccount,
          ),
          disabledAccount.id,
        ),
      );
      setSelectedAccountId(disabledAccount.id);
    } catch (disableAccountError) {
      setDisableError(
        disableAccountError instanceof ApiError
          ? disableAccountError.message
          : "Account could not be disabled.",
      );
    } finally {
      setDisablingAccountId(null);
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
              onSelect={() => {
                setDeleteDialogOpen(false);
                setDeleteError(null);
                setDisableError(null);
                setSelectedAccountId(account.id);
                setDetailAccountId(account.id);
              }}
            />
          ))
        )}
      </section>
      <Dialog
        open={Boolean(detailAccount)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setDeleteError(null);
            setDisableError(null);
            setDetailAccountId(null);
          }
        }}
      >
        {detailAccount ? (
          <AccountDetailsDialog
            account={detailAccount}
            deleteDialogOpen={deleteDialogOpen}
            deleteError={deleteError}
            disableError={disableError}
            isCheckingDelete={isCheckingDelete}
            isDeleting={isDeleting}
            isDisabling={disablingAccountId === detailAccount.id}
            onDelete={() => void handleDeleteAccount(detailAccount)}
            onDeleteDialogOpenChange={setDeleteDialogOpen}
            onPrepareDelete={() => void handlePrepareDeleteAccount(detailAccount)}
            onDisable={() => void handleDisableAccount(detailAccount)}
          />
        ) : null}
      </Dialog>
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

function AccountDetailsDialog({
  account,
  deleteDialogOpen,
  deleteError,
  disableError,
  isCheckingDelete,
  isDeleting,
  isDisabling,
  onDelete,
  onDeleteDialogOpenChange,
  onPrepareDelete,
  onDisable,
}: {
  account: Account;
  deleteDialogOpen: boolean;
  deleteError: string | null;
  disableError: string | null;
  isCheckingDelete: boolean;
  isDeleting: boolean;
  isDisabling: boolean;
  onDelete: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onPrepareDelete: () => void;
  onDisable: () => void;
}) {
  const isActive = isAccountActive(account);
  const typeLabel =
    ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type;

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="pr-6">{account.name}</DialogTitle>
        <DialogDescription>
          {typeLabel} - {account.currency}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        <DetailTile
          label="Current balance"
          value={formatAccountMoney(account)}
        />
        <DetailTile
          label="Initial balance"
          value={formatAccountMoney(account, "opening_balance")}
        />
      </div>
      <div className="space-y-2 rounded-lg border border-input/50 bg-secondary/70 p-3">
        <DetailRow label="Status" value={isActive ? "Active" : "Disabled"} />
        <DetailRow label="Default" value={account.is_default ? "Yes" : "No"} />
        <DetailRow label="Currency" value={account.currency} />
        <DetailRow label="Type" value={typeLabel} />
        <DetailRow
          label="Created"
          value={formatAccountDate(account.created_at)}
        />
      </div>
      {disableError ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
          {disableError}
        </p>
      ) : null}
      <Button
        type="button"
        variant={isActive ? "destructive" : "outline"}
        disabled={!isActive || isDisabling}
        onClick={onDisable}
      >
        <BanIcon className="size-4" />
        {isActive
          ? isDisabling
            ? "Disabling..."
            : "Disable Account"
          : "Account Disabled"}
      </Button>
      {deleteError ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
          {deleteError}
        </p>
      ) : null}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
      >
        <Button
          type="button"
          variant="outline"
          disabled={isCheckingDelete || isDeleting}
          onClick={onPrepareDelete}
        >
          <Trash2Icon className="size-4" />
          {isCheckingDelete
            ? "Checking..."
            : isDeleting
              ? "Deleting..."
              : "Delete Account"}
        </Button>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this account?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the account from the active list only when no linked
            records use it.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-input/50 bg-secondary/70 p-3">
      <p className="text-xs font-bold text-input uppercase">{label}</p>
      <p className="mt-1 break-words text-lg font-black">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-input">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function formatAccountDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function deleteRestrictionMessage(reasons: string[]): string {
  if (reasons.includes("transaction")) {
    return "Account cannot be deleted because it is used in transactions.";
  }
  if (reasons.includes("recurring_rule")) {
    return "Account cannot be deleted because it is used in recurring rules.";
  }
  if (reasons.includes("loan_not_connected")) {
    return "Loan account usage is not connected yet, so this account cannot be safely deleted.";
  }
  return "Account cannot be deleted because it is already used.";
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
