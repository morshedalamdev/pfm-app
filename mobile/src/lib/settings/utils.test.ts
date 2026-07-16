import { describe, expect, it } from "vitest";

import { emptyToNull, futureDate, isCurrencyCode, isPositiveMoney, localDateTimeValue, profileInitials, settingsSection } from "@/lib/settings/utils";

describe("settings utilities", () => {
  it("accepts known sections and falls back to overview", () => {
    expect(settingsSection("loans")).toBe("loans");
    expect(settingsSection("unknown")).toBe("overview");
    expect(settingsSection(undefined)).toBe("overview");
  });

  it("validates backend-compatible positive money strings", () => {
    expect(isPositiveMoney("12.3400")).toBe(true);
    expect(isPositiveMoney("0")).toBe(false);
    expect(isPositiveMoney("1.00000")).toBe(false);
    expect(isPositiveMoney("$4")).toBe(false);
  });

  it("builds stable local form date values", () => {
    const date = new Date("2026-07-15T09:30:00.000Z");
    expect(localDateTimeValue(date)).toHaveLength(16);
    expect(futureDate(30, date)).toBe("2026-08-14");
  });
});

describe("profile helpers", () => {
  it("normalizes optional profile text", () => {
    expect(emptyToNull("  Designer  ")).toBe("Designer");
    expect(emptyToNull("   ")).toBeNull();
  });

  it("validates three-letter uppercase currencies", () => {
    expect(isCurrencyCode("USD")).toBe(true);
    expect(isCurrencyCode("usd")).toBe(false);
    expect(isCurrencyCode("US")).toBe(false);
  });

  it("creates approachable avatar initials", () => {
    expect(profileInitials("Morgan Lee", "morgan@example.com")).toBe("ML");
    expect(profileInitials(null, "morgan@example.com")).toBe("M");
  });
});
