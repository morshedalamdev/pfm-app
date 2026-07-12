"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
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
import { getActiveAccounts } from "@/lib/finance/accounts";
import {
  type Account,
  type Budget,
  listAccounts,
  listBudgets,
} from "@/lib/finance/api";

type User = components["schemas"]["UserResponse"];
type UserUpdateRequest = components["schemas"]["UserUpdateRequest"];
type HomeBalanceSourceType = NonNullable<
  UserUpdateRequest["home_balance_source_type"]
>;
type HomeBalanceSourceSelection =
  | "automatic"
  | `${HomeBalanceSourceType}:${string}`;

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
    useState<HomeBalanceSourceType | "automatic">("automatic");
  const [homeBalanceSourceId, setHomeBalanceSourceId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accountSourcesLoaded, setAccountSourcesLoaded] = useState(false);
  const [budgetSourcesLoaded, setBudgetSourcesLoaded] = useState(false);
  const [isSourceLoading, setIsSourceLoading] = useState(true);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);
  const [sourceWarning, setSourceWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isLoading = status === "loading" && !user;
  const currentCurrency =
    CURRENCY_OPTIONS.find((option) => option.value === user?.base_currency) ??
    CURRENCY_OPTIONS[0];
  const activeAccounts = useMemo(() => getActiveAccounts(accounts), [accounts]);
  const sourceSelection: HomeBalanceSourceSelection =
    homeBalanceSourceType === "automatic" || !homeBalanceSourceId
      ? "automatic"
      : `${homeBalanceSourceType}:${homeBalanceSourceId}`;
  const hasSourceOptions = activeAccounts.length > 0 || budgets.length > 0;
  const allSourceListsLoaded = accountSourcesLoaded && budgetSourcesLoaded;

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
    const controller = new AbortController();

    async function loadBalanceSources() {
      setIsSourceLoading(true);
      setSourceLoadError(null);
      setAccountSourcesLoaded(false);
      setBudgetSourcesLoaded(false);

      const [accountResult, budgetResult] = await Promise.allSettled([
        listAccounts({ signal: controller.signal }),
        listBudgets(currentMonthKey(), { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setAccounts(
        accountResult.status === "fulfilled" ? accountResult.value : [],
      );
      setBudgets(budgetResult.status === "fulfilled" ? budgetResult.value : []);
      setAccountSourcesLoaded(accountResult.status === "fulfilled");
      setBudgetSourcesLoaded(budgetResult.status === "fulfilled");
      if (
        accountResult.status === "rejected" ||
        budgetResult.status === "rejected"
      ) {
        setSourceLoadError("Some balance sources could not be loaded.");
      }
      setIsSourceLoading(false);
    }

    void loadBalanceSources();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isSourceLoading || homeBalanceSourceType === "automatic") {
      return;
    }

    const selectedSourceListLoaded =
      homeBalanceSourceType === "account"
        ? accountSourcesLoaded
        : budgetSourcesLoaded;
    const sourceExists =
      homeBalanceSourceType === "account"
        ? activeAccounts.some((account) => account.id === homeBalanceSourceId)
        : budgets.some((budget) => budget.id === homeBalanceSourceId);

    if (selectedSourceListLoaded && !sourceExists) {
      setHomeBalanceSourceType("automatic");
      setHomeBalanceSourceId("");
      setSourceWarning(
        "The previously selected source is unavailable. Automatic fallback will be used.",
      );
    }
  }, [
    activeAccounts,
    accountSourcesLoaded,
    budgets,
    budgetSourcesLoaded,
    homeBalanceSourceId,
    homeBalanceSourceType,
    isSourceLoading,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const homeBalanceSourceRequest =
      homeBalanceSourceType === "automatic"
        ? {
            home_balance_source_id: null,
            home_balance_source_type: null,
          }
        : {
            home_balance_source_id: homeBalanceSourceId,
            home_balance_source_type: homeBalanceSourceType,
          };

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
                    value={sourceSelection}
                    onValueChange={(value) => {
                      const nextValue = value as HomeBalanceSourceSelection;
                      if (nextValue === "automatic") {
                        setHomeBalanceSourceType("automatic");
                        setHomeBalanceSourceId("");
                      } else {
                        const separatorIndex = nextValue.indexOf(":");
                        setHomeBalanceSourceType(
                          nextValue.slice(
                            0,
                            separatorIndex,
                          ) as HomeBalanceSourceType,
                        );
                        setHomeBalanceSourceId(
                          nextValue.slice(separatorIndex + 1),
                        );
                      }
                      setSourceWarning(null);
                    }}
                    disabled={isLoading || isSaving || isSourceLoading}
                  >
                    <SelectTrigger className="border-0">
                      <SelectValue placeholder="Select balance source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Home Balance Source</SelectLabel>
                        <SelectItem value="automatic">
                          Automatic fallback
                        </SelectItem>
                      </SelectGroup>
                      {activeAccounts.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>Active Accounts</SelectLabel>
                          {activeAccounts.map((account) => (
                            <SelectItem
                              key={account.id}
                              value={`account:${account.id}`}
                            >
                              {account.name} ({account.currency})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {budgets.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>Budget Plans</SelectLabel>
                          {budgets.map((budget) => (
                            <SelectItem
                              key={budget.id}
                              value={`budget:${budget.id}`}
                            >
                              {budgetSourceLabel(budget)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {allSourceListsLoaded && !hasSourceOptions ? (
                        <SelectGroup>
                          <SelectLabel>
                            No active accounts or budget plans available
                          </SelectLabel>
                        </SelectGroup>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <InputGroupAddon className="text-white font-bold">
                    Source:
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {sourceLoadError ? (
                <p className="text-sm font-medium text-destructive">
                  {sourceLoadError}
                </p>
              ) : null}
              {sourceWarning ? (
                <p className="text-sm font-medium text-muted-foreground">
                  {sourceWarning}
                </p>
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

function budgetSourceLabel(budget: Budget): string {
  const name = budget.category_name ?? "Monthly Budget";
  const period = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${budget.period_start}T00:00:00Z`));
  return `${name} - ${period} (${budget.currency})`;
}
