import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { loginSchema, registerSchema } from "@/lib/auth/schemas";
import { useAuthStore } from "@/lib/auth/store";

const user = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: "2026-07-15T00:00:00Z",
  email: "mobile@example.com",
  full_name: "Mobile User",
  home_balance_source_id: null,
  home_balance_source_type: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_active: true,
  occupation: null,
  phone_number: null,
} as const;

describe("auth client boundaries", () => {
  it("keeps post-login navigation on the same origin", () => {
    expect(getSafeNextPath("/report?period=month")).toBe("/report?period=month");
    expect(getSafeNextPath("//evil.example/steal")).toBe("/");
    expect(getSafeNextPath("https://evil.example/steal")).toBe("/");
  });

  it("matches the backend password policy during registration", () => {
    expect(
      registerSchema.safeParse({
        confirmPassword: "CorrectHorse42",
        email: "mobile@example.com",
        fullName: "Mobile User",
        password: "CorrectHorse42",
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        confirmPassword: "short",
        email: "mobile@example.com",
        fullName: "Mobile User",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("requires both login fields", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });

  it("stores user state without browser-persisted tokens", () => {
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user,
    });
    expect(JSON.stringify(useAuthStore.getState())).not.toContain("access_token");
    expect(JSON.stringify(useAuthStore.getState())).not.toContain("refresh_token");
    useAuthStore.getState().clearSession();
  });
});
