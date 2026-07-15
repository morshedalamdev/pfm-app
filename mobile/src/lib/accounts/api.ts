import { getBackendJson, sendBackendJson } from "@/lib/api/client";
import type { Account, AccountCreate, AccountDeleteEligibility, AccountList } from "@/lib/accounts/types";

export function getAccounts() {
  return getBackendJson<AccountList>("accounts?limit=100", "We couldn't load your accounts.");
}

export function getAccount(id: string) {
  return getBackendJson<Account>(`accounts/${encodeURIComponent(id)}`, "We couldn't load this account.");
}

export function createAccount(payload: AccountCreate) {
  return sendBackendJson<Account>("accounts", "POST", payload);
}

export function setDefaultAccount(id: string) {
  return sendBackendJson<Account>(`accounts/${encodeURIComponent(id)}/default`, "PATCH");
}

export function disableAccount(id: string) {
  return sendBackendJson<Account>(`accounts/${encodeURIComponent(id)}/disable`, "PATCH");
}

export function getAccountDeleteEligibility(id: string) {
  return getBackendJson<AccountDeleteEligibility>(
    `accounts/${encodeURIComponent(id)}/delete-eligibility`,
    "We couldn't check whether this account can be removed.",
  );
}

export function deleteAccount(id: string) {
  return sendBackendJson<Account>(`accounts/${encodeURIComponent(id)}`, "DELETE");
}
