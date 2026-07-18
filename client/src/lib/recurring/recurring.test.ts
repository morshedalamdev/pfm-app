import { afterEach, describe, expect, it, vi } from "vitest";

import { notificationHref } from "@/lib/notifications/utils";
import { completeReminder } from "@/lib/recurring/api";
import type { DueReminder, RecurringRule } from "@/lib/recurring/types";
import { isPositiveMoney, recurringCadence, recurringTitle } from "@/lib/recurring/utils";

const rule = {
  account_id: "11111111-1111-1111-1111-111111111111", amount: "85.0000", archived_at: null,
  category_id: "22222222-2222-2222-2222-222222222222", created_at: "2026-07-01T00:00:00Z", currency: "USD",
  description: "Internet bill", end_at: null, frequency: "monthly", id: "33333333-3333-3333-3333-333333333333",
  interval_count: 1, last_paid_period: null, last_received_period: null, last_run_at: null, last_run_key: null,
  next_run_at: "2026-08-01T08:00:00Z", paused_at: null, run_count: 0, start_at: "2026-07-01T08:00:00Z",
  status: "active", timezone: "UTC", transaction_type: "expense", updated_at: "2026-07-01T00:00:00Z",
} satisfies RecurringRule;

afterEach(() => vi.unstubAllGlobals());

describe("recurring and notification journeys", () => {
  it("describes schedules and validates backend-compatible amounts", () => {
    expect(recurringTitle(rule)).toBe("Internet bill");
    expect(recurringCadence(rule)).toBe("monthly");
    expect(recurringCadence({ frequency: "weekly", interval_count: 2 })).toBe("every 2 weeks");
    expect(isPositiveMoney("12.3400")).toBe(true);
    expect(isPositiveMoney("0")).toBe(false);
  });

  it("marks due reminders with the correct timestamp field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ rule, transaction: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const expense = { due_at: rule.next_run_at, period_key: "2026-08", reminder_key: "expense-1", reminder_type: "expense", rule } satisfies DueReminder;
    await completeReminder(expense);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/recurring-rules/${rule.id}/paid`);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toHaveProperty("paid_at");
  });

  it("routes actionable notification payloads to meaningful paths", () => {
    const base = { created_at: "2026-07-15T00:00:00Z", email_delivery_status: "not_requested" as const, email_requested_at: null, email_sent_at: null, id: "44444444-4444-4444-4444-444444444444", message: "Created", read_at: null, title: "Recurring transaction", type: "recurring.transaction.created", updated_at: "2026-07-15T00:00:00Z", user_id: "55555555-5555-5555-5555-555555555555" };
    expect(notificationHref({ ...base, payload: { transaction_id: "66666666-6666-6666-6666-666666666666" } })).toBe("/transaction/66666666-6666-6666-6666-666666666666");
    expect(notificationHref({ ...base, payload: { recurring_rule_id: rule.id } })).toBe(`/transaction/recurring/${rule.id}`);
  });
});
