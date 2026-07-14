"use client";

import { type FormEvent, useEffect, useState } from "react";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { components } from "@/generated/api-types";
import { apiPatch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/store";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";

type User = components["schemas"]["UserResponse"];
type UserUpdateRequest = components["schemas"]["UserUpdateRequest"];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === "loading" && !user;

  useEffect(() => {
    if (status === "idle") {
      void hydrate();
    }
  }, [hydrate, status]);

  useEffect(() => {
    if (user?.base_currency) {
      setBaseCurrency(user.base_currency);
    }
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const updatedUser = await apiPatch<UserUpdateRequest, User>(
        "/api/v1/users/me",
        {
          base_currency: baseCurrency,
        },
      );
      useAuthStore.setState({ user: updatedUser });
      setMessage("Settings updated.");
    } catch (err) {
      if (err instanceof ApiError && err.kind === "conflict") {
        setError("Currency can only be changed once per month.");
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update settings. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex h-dvh flex-col">
      <Header title="Settings" homeBtn={true}>
        <BackBtn />
      </Header>
      <section className="mt-5 space-y-4 px-3">
        <div className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm">
          <ThemeSelector />
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm"
        >
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="base-currency">Currency</FieldLabel>
                <NativeSelect
                  id="base-currency"
                  aria-label="Current currency"
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value)}
                  disabled={isLoading || isSaving}
                  className="w-full border border-input bg-input-background"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <NativeSelectOption
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Current currency: {user?.base_currency ?? baseCurrency}
                </FieldDescription>
                {error ? <FieldError>{error}</FieldError> : null}
                {message ? (
                  <p className="text-sm font-semibold text-success">
                    {message}
                  </p>
                ) : null}
              </Field>
              <Button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </main>
  );
}
