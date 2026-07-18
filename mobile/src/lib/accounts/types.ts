import type { components } from "@generated/api-types";

export type Account = components["schemas"]["AccountResponse"];
export type AccountCreate = components["schemas"]["AccountCreateRequest"];
export type AccountDeleteEligibility = components["schemas"]["AccountDeleteEligibilityResponse"];
export type AccountList = components["schemas"]["AccountListResponse"];

export const accountTypes = [
  ["bank_account", "Bank account"],
  ["cash", "Cash"],
  ["debit_card", "Debit card"],
  ["credit_card", "Credit card"],
  ["mobile_banking", "Mobile banking"],
] as const satisfies ReadonlyArray<readonly [AccountCreate["type"], string]>;
