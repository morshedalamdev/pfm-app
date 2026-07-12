"use client";

import { type FormEvent, useEffect, useState } from "react";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { components } from "@/generated/api-types";
import { apiPatch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/store";
import { listBudgets } from "@/lib/finance/api";

type User = components["schemas"]["UserResponse"];
type UserUpdateRequest = components["schemas"]["UserUpdateRequest"];
type HomeBalanceSourceType = NonNullable<
  UserUpdateRequest["home_balance_source_type"]
>;
type HomeBalanceSourceSelection = "automatic" | HomeBalanceSourceType;

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BDT", label: "BDT - Bangladeshi Taka" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese RMB (¥)" },
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [currency, setCurrency] = useState("USD");
  const [homeBalanceSourceType, setHomeBalanceSourceType] =
    useState<HomeBalanceSourceSelection>("automatic");
  const [homeBalanceSourceId, setHomeBalanceSourceId] = useState("");
  const [hasBudgetSourceOption, setHasBudgetSourceOption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isLoading = status === "loading" && !user;
  const currentCurrency =
    CURRENCY_OPTIONS.find((option) => option.value === user?.base_currency) ??
    CURRENCY_OPTIONS[0];

  useEffect(() => {
    if (status === "idle") {
      void hydrate();
    }
  }, [hydrate, status]);

  useEffect(() => {
    if (user?.base_currency) {
      setCurrency(user.base_currency);
    }
    setHomeBalanceSourceType(user?.home_balance_source_type ?? "automatic");
    setHomeBalanceSourceId(user?.home_balance_source_id ?? "");
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadBudgetSourceAvailability() {
      try {
        const budgets = await listBudgets(currentMonthKey());
        if (isMounted) {
          setHasBudgetSourceOption(budgets.length > 0);
        }
      } catch {
        if (isMounted) {
          setHasBudgetSourceOption(false);
        }
      }
    }

    void loadBudgetSourceAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedHomeBalanceSourceId = homeBalanceSourceId.trim();
    const homeBalanceSourceRequest =
      homeBalanceSourceType === "automatic"
        ? {
            home_balance_source_id: null,
            home_balance_source_type: null,
          }
        : {
            home_balance_source_id: trimmedHomeBalanceSourceId,
            home_balance_source_type: homeBalanceSourceType,
          };

    if (
      homeBalanceSourceType !== "automatic" &&
      trimmedHomeBalanceSourceId.length === 0
    ) {
      setError("Enter a source ID or use automatic fallback.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await apiPatch<UserUpdateRequest, User>(
        "/api/v1/users/me",
        {
          base_currency: currency,
          ...homeBalanceSourceRequest,
        },
      );
      useAuthStore.setState({ user: updatedUser });
      setMessage("Settings updated.");
    } catch (err) {
      if (err instanceof ApiError && err.kind === "conflict") {
        setError("Currency can only be changed once per month.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to update settings. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex flex-col h-dvh">
      <Header title="Settings" homeBtn={true}>
        <BackBtn />
      </Header>
      <section className="px-3 space-y-3 mt-5">
        <form onSubmit={handleSubmit}>
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <p className="text-sm font-medium text-muted-foreground">
                  Current currency: {currentCurrency.label}
                </p>
                <InputGroup>
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={isLoading || isSaving}
                  >
                    <SelectTrigger className="border-0">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Currency</SelectLabel>
                        {CURRENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <InputGroupAddon className="text-white font-bold">
                    Currency:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{error}</FieldError>
              </Field>
              <Field data-invalid={Boolean(error)}>
                <p className="text-sm font-medium text-muted-foreground">
                  Home Balance Source
                </p>
                <InputGroup>
                  <Select
                    value={homeBalanceSourceType}
                    onValueChange={(value) => {
                      const nextValue = value as HomeBalanceSourceSelection;
                      setHomeBalanceSourceType(nextValue);
                      if (nextValue === "automatic") {
                        setHomeBalanceSourceId("");
                      }
                    }}
                    disabled={isLoading || isSaving}
                  >
                    <SelectTrigger className="border-0">
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Home Balance Source</SelectLabel>
                        <SelectItem value="automatic">
                          Automatic fallback
                        </SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        {(hasBudgetSourceOption ||
                          homeBalanceSourceType === "budget") && (
                          <SelectItem value="budget">Budget</SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <InputGroupAddon className="text-white font-bold">
                    Source:
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {homeBalanceSourceType !== "automatic" ? (
                <Field data-invalid={Boolean(error)}>
                  <InputGroup>
                    <Input
                      value={homeBalanceSourceId}
                      onChange={(event) =>
                        setHomeBalanceSourceId(event.target.value)
                      }
                      placeholder="Source ID"
                      disabled={isLoading || isSaving}
                    />
                    <InputGroupAddon className="text-white font-bold">
                      ID:
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              ) : null}
              {message ? (
                <p className="text-sm font-medium text-primary">{message}</p>
              ) : null}
              <Field>
                <Button type="submit" disabled={isLoading || isSaving}>
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </main>
  );
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
