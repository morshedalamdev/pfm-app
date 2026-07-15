import { describe, expect, it } from "vitest";

import { accountDeleteReason, canDeleteAccount, getDefaultAccount, isAccountActive } from "@/lib/accounts/utils";

const activeDefault = {
  archived_at: null, created_at: "2026-01-01T00:00:00Z", currency: "USD", current_balance: "30", disabled_at: null,
  id: "11111111-1111-1111-1111-111111111111", is_archived: false, is_default: true, is_disabled: false,
  name: "Daily", opening_balance: "0", type: "bank_account", updated_at: "2026-01-01T00:00:00Z",
} as const;

describe("account helpers", () => {
  it("uses only an active default account as the home balance source", () => {
    expect(isAccountActive(activeDefault)).toBe(true);
    expect(getDefaultAccount([{ ...activeDefault, is_disabled: true }, activeDefault])).toEqual(activeDefault);
    expect(getDefaultAccount([{ ...activeDefault, is_disabled: true }])).toBeNull();
  });

  it("keeps deletion guarded by backend eligibility", () => {
    expect(canDeleteAccount({ account_id: activeDefault.id, can_delete: true, reasons: [] })).toBe(true);
    const eligibility = { account_id: activeDefault.id, can_delete: false, reasons: ["transaction", "recurring_rule"] as Array<"transaction" | "recurring_rule"> };
    expect(canDeleteAccount(eligibility)).toBe(false);
    expect(accountDeleteReason(eligibility)).toBe("This account is linked to transactions, recurring schedules.");
  });
});
