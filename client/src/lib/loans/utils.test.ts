import { describe, expect, it } from "vitest";
import type { LoanRecord } from "@/lib/loans/types";
import { isOverdue, isPositiveMoney, loanPercent, loanPersonName } from "@/lib/loans/utils";

const record = (overrides: Partial<LoanRecord> = {}): LoanRecord => ({ account_id: "account", archived_at: null, created_at: "2026-07-01T00:00:00Z", currency: "USD", direction: "given", id: "loan", issued_at: "2026-07-01T00:00:00Z", note: null, outstanding_amount: "600", person_id: "person", principal_amount: "1000", repay_date: "2026-07-10", settled_amount: "400", settled_at: null, status: "open", updated_at: "2026-07-01T00:00:00Z", ...overrides });

describe("loan helpers", () => {
  it("derives a person name and capped settlement progress", () => {
    expect(loanPersonName(record(), [{ id: "person", name: "Alex" }])).toBe("Alex");
    expect(loanPercent(record({ settled_amount: "1500" }))).toBe(100);
  });

  it("flags only open outstanding records beyond the repay date", () => {
    expect(isOverdue(record(), "2026-07-16")).toBe(true);
    expect(isOverdue(record({ status: "settled", outstanding_amount: "0" }), "2026-07-16")).toBe(false);
    expect(isPositiveMoney("0.01")).toBe(true);
    expect(isPositiveMoney("0")).toBe(false);
  });
});
