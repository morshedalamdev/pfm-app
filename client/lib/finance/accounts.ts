import {
  canDeleteAccount,
  deleteAccount,
  type Account,
  type AccountDeleteEligibility,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";

export type AccountBalanceField = "current_balance" | "opening_balance";

export function isAccountActive(account: Account): boolean {
  return !account.is_archived && !account.is_disabled;
}

export function getActiveAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isAccountActive);
}

export function getDefaultAccount(accounts: Account[]): Account | null {
  return (
    accounts.find((account) => isAccountActive(account) && account.is_default) ?? null
  );
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
