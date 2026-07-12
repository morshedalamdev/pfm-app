import {
  canDeleteAccount,
  deleteAccount,
  type Account,
  type AccountDeleteEligibility,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";

export type AccountBalanceField = "current_balance" | "opening_balance";

export type AccountSelectOption = {
  balanceLabel: string;
  currency: string;
  id: string;
  isDefault: boolean;
  label: string;
  value: string;
};

export function isAccountActive(account: Account): boolean {
  return !account.is_archived && !account.is_disabled;
}

export function getAccountById(
  accounts: Account[],
  accountId: string | null | undefined,
): Account | null {
  if (!accountId) {
    return null;
  }
  return accounts.find((account) => account.id === accountId) ?? null;
}

export function getActiveAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isAccountActive);
}

export function getDefaultAccount(accounts: Account[]): Account | null {
  return (
    accounts.find((account) => isAccountActive(account) && account.is_default) ?? null
  );
}

export function getDefaultAccountId(accounts: Account[]): string {
  return getDefaultAccount(accounts)?.id ?? "";
}

export function resolveAccountSelectValue(
  accounts: Account[],
  preferredAccountId?: string | null,
): string {
  const preferredAccount = getAccountById(accounts, preferredAccountId);
  if (preferredAccount && isAccountActive(preferredAccount)) {
    return preferredAccount.id;
  }

  const defaultAccount = getDefaultAccount(accounts);
  if (defaultAccount) {
    return defaultAccount.id;
  }

  return getActiveAccounts(accounts)[0]?.id ?? "";
}

export function setDefaultAccountInList(
  accounts: Account[],
  accountId: string,
): Account[] {
  return accounts.map((account) => ({
    ...account,
    is_default: account.id === accountId && isAccountActive(account),
  }));
}

export function disableAccountInList(
  accounts: Account[],
  accountId: string,
): Account[] {
  const disabledAccounts = accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          disabled_at: account.disabled_at ?? new Date().toISOString(),
          is_default: false,
          is_disabled: true,
        }
      : account,
  );

  if (getDefaultAccount(disabledAccounts)) {
    return disabledAccounts;
  }

  const fallbackAccount = getActiveAccounts(disabledAccounts)[0];
  if (!fallbackAccount) {
    return disabledAccounts;
  }

  return setDefaultAccountInList(disabledAccounts, fallbackAccount.id);
}

export function formatAccountMoney(
  account: Account,
  field: AccountBalanceField = "current_balance",
): string {
  return formatMoney(account[field], account.currency);
}

export function formatAccountAmount(
  accounts: Account[],
  accountId: string | null | undefined,
  value: string | number,
  fallbackCurrency = "USD",
): string {
  const account = getAccountById(accounts, accountId);
  return formatMoney(value, account?.currency ?? fallbackCurrency);
}

export function getAccountSelectOptions(accounts: Account[]): AccountSelectOption[] {
  return getActiveAccounts(accounts).map((account) => ({
    balanceLabel: formatAccountMoney(account),
    currency: account.currency,
    id: account.id,
    isDefault: account.is_default,
    label: formatAccountSelectLabel(account),
    value: account.id,
  }));
}

export function formatAccountSelectLabel(account: Account): string {
  const defaultSuffix = account.is_default ? " - Default" : "";
  return `${account.name} - ${account.currency} - ${formatAccountMoney(
    account,
  )}${defaultSuffix}`;
}

export function canDeleteAccountFromEligibility(
  eligibility: AccountDeleteEligibility,
): boolean {
  return eligibility.can_delete && eligibility.reasons.length === 0;
}

export async function deleteAccountWhenSafe(accountId: string): Promise<Account> {
  const eligibility = await canDeleteAccount(accountId);
  if (!canDeleteAccountFromEligibility(eligibility)) {
    throw new Error("Account cannot be removed because it is already used.");
  }
  return deleteAccount(accountId);
}
