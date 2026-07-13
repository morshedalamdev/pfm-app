"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  BanIcon,
  CheckCircle2Icon,
  CircleIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";

import Header from "@/components/Header";
import AccountTypeIcon from "@/components/accounts/AccountTypeIcon";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import {
  canDeleteAccountFromEligibility,
  deleteAccountWhenSafe,
  disableAccountInList,
  formatAccountMoney,
  isAccountActive,
  setDefaultAccountInList,
} from "@/lib/finance/accounts";
import { getAccountTypeLabel } from "@/lib/finance/accountTypes";
import {
  canDeleteAccount,
  disableAccount,
  listAccounts,
  setDefaultAccount,
  type Account,
  type AccountDeleteEligibility,
} from "@/lib/finance/api";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEligibility, setDeleteEligibility] =
    useState<AccountDeleteEligibility | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disablingAccountId, setDisablingAccountId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(
    null,
  );
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
        setDefaultError(null);
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

  useEffect(() => {
    if (!detailAccountId) {
      setDeleteEligibility(null);
      setIsCheckingDelete(false);
      return;
    }

    const controller = new AbortController();
    setDeleteEligibility(null);
    setDeleteError(null);
    setIsCheckingDelete(true);
    void canDeleteAccount(detailAccountId, { signal: controller.signal })
      .then((eligibility) => {
        if (!controller.signal.aborted) {
          setDeleteEligibility(eligibility);
        }
      })
      .catch((eligibilityError) => {
        if (!controller.signal.aborted) {
          setDeleteError(
            eligibilityError instanceof ApiError
              ? eligibilityError.message
              : "Account delete eligibility could not be checked.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsCheckingDelete(false);
        }
      });

    return () => controller.abort();
  }, [detailAccountId]);

  const accountSummary = useMemo(() => {
    const activeCount = accounts.filter(isAccountActive).length;
    return {
      activeCount,
      totalCount: accounts.length,
    };
  }, [accounts]);

  const detailAccount =
    accounts.find((account) => account.id === detailAccountId) ?? null;

  async function handleSetDefaultAccount(account: Account) {
    if (!isAccountActive(account) || account.is_default) {
      return;
    }

    setDefaultError(null);
    setSettingDefaultId(account.id);
    try {
      const defaultAccount = await setDefaultAccount(account.id);
      setAccounts((current) =>
        setDefaultAccountInList(
          current.map((currentAccount) =>
            currentAccount.id === defaultAccount.id
              ? defaultAccount
              : currentAccount,
          ),
          defaultAccount.id,
        ),
      );
      setSelectedAccountId(defaultAccount.id);
    } catch (defaultAccountError) {
      setDefaultError(
        defaultAccountError instanceof ApiError
          ? defaultAccountError.message
          : "Account could not be set as default.",
      );
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handlePrepareDeleteAccount(account: Account) {
    setDeleteError(null);
    setIsCheckingDelete(true);
    try {
      const eligibility = await canDeleteAccount(account.id);
      setDeleteEligibility(eligibility);
      if (!canDeleteAccountFromEligibility(eligibility)) {
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
      <Header homeBtn={true} title="Accounts">
        <Button asChild variant="link" size="icon-sm">
          <Link href="/accounts/create" aria-label="Create account">
            <PlusIcon />
          </Link>
        </Button>
      </Header>
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
                setDefaultError(null);
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
            setDefaultError(null);
            setDisableError(null);
            setDetailAccountId(null);
          }
        }}
      >
        {detailAccount ? (
          <AccountDetailsDialog
            account={detailAccount}
            canDelete={deleteEligibility?.can_delete === true}
            deleteDialogOpen={deleteDialogOpen}
            deleteError={deleteError}
            defaultError={defaultError}
            disableError={disableError}
            isCheckingDelete={isCheckingDelete}
            isDeleting={isDeleting}
            isDisabling={disablingAccountId === detailAccount.id}
            isSettingDefault={settingDefaultId === detailAccount.id}
            onDelete={() => void handleDeleteAccount(detailAccount)}
            onDeleteDialogOpenChange={setDeleteDialogOpen}
            onPrepareDelete={() => void handlePrepareDeleteAccount(detailAccount)}
            onDisable={() => void handleDisableAccount(detailAccount)}
            onSetDefault={() => void handleSetDefaultAccount(detailAccount)}
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
  const typeLabel = getAccountTypeLabel(account.type);

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
            <AccountTypeIcon className="size-4" type={account.type} />
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
  canDelete,
  deleteDialogOpen,
  deleteError,
  defaultError,
  disableError,
  isCheckingDelete,
  isDeleting,
  isDisabling,
  isSettingDefault,
  onDelete,
  onDeleteDialogOpenChange,
  onPrepareDelete,
  onDisable,
  onSetDefault,
}: {
  account: Account;
  canDelete: boolean;
  deleteDialogOpen: boolean;
  deleteError: string | null;
  defaultError: string | null;
  disableError: string | null;
  isCheckingDelete: boolean;
  isDeleting: boolean;
  isDisabling: boolean;
  isSettingDefault: boolean;
  onDelete: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onPrepareDelete: () => void;
  onDisable: () => void;
  onSetDefault: () => void;
}) {
  const isActive = isAccountActive(account);
  const typeLabel = getAccountTypeLabel(account.type);

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-2 pr-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <AccountTypeIcon className="size-4" type={account.type} />
          </span>
          <DialogTitle>{account.name}</DialogTitle>
        </div>
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
      {defaultError ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
          {defaultError}
        </p>
      ) : null}
      <Button
        type="button"
        variant={isActive && !account.is_default ? "default" : "outline"}
        disabled={!isActive || account.is_default || isSettingDefault}
        onClick={onSetDefault}
      >
        <StarIcon className="size-4" />
        {account.is_default
          ? "Default Account"
          : isSettingDefault
            ? "Setting Default..."
            : "Set as Default"}
      </Button>
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
      {canDelete ? (
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
            {isDeleting ? "Deleting..." : "Delete Account"}
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
      ) : null}
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

function AccountListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}
