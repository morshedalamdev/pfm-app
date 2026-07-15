import type { Account, AccountDeleteEligibility } from "@/lib/accounts/types";

export function isAccountActive(account: Account): boolean {
  return !account.is_archived && !account.is_disabled;
}

export function getDefaultAccount(accounts: Account[]): Account | null {
  return accounts.find((account) => isAccountActive(account) && account.is_default) ?? null;
}

export function canDeleteAccount(eligibility: AccountDeleteEligibility): boolean {
  return eligibility.can_delete && eligibility.reasons.length === 0;
}

export function accountDeleteReason(eligibility: AccountDeleteEligibility): string {
  const labels = {
    loan_record: "loan records",
    loan_settlement: "loan settlements",
    recurring_rule: "recurring schedules",
    transaction: "transactions",
  } as const;
  const reasons = eligibility.reasons.map((reason) => labels[reason]);
  return reasons.length ? `This account is linked to ${reasons.join(", ")}.` : "This account can’t be removed yet.";
}
