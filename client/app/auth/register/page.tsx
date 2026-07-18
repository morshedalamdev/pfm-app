"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import {
  clearOAuthRegistrationTicket,
  getOAuthRegistrationTicket,
  previewOAuthRegistration,
  type OAuthProvider,
} from "@/lib/auth/oauth";
import { useAuthStore } from "@/lib/auth/store";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((state) => state.register);
  const registerOAuth = useAuthStore((state) => state.registerOAuth);
  const status = useAuthStore((state) => state.status);
  const [name, setName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registrationTicket, setRegistrationTicket] = useState<string | null>(
    null,
  );
  const [provider, setProvider] = useState<OAuthProvider | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isOAuthRegistration = searchParams.get("oauth") === "1";
  const isLoading = status === "loading" || isLoadingProfile;

  useEffect(() => {
    if (!isOAuthRegistration) {
      setRegistrationTicket(null);
      setProvider(null);
      setEmail(searchParams.get("email") ?? "");
      return;
    }

    const ticket = getOAuthRegistrationTicket();
    if (!ticket) {
      setError("Your secure sign-up session has expired. Please try again.");
      return;
    }

    let active = true;
    setIsLoadingProfile(true);
    setError(null);
    void previewOAuthRegistration(ticket)
      .then((profile) => {
        if (!active) return;
        setRegistrationTicket(ticket);
        setProvider(profile.provider);
        setName(profile.full_name);
        setEmail(profile.email);
      })
      .catch((previewError) => {
        if (!active) return;
        clearOAuthRegistrationTicket();
        setRegistrationTicket(null);
        setError(
          previewError instanceof ApiError
            ? "Your secure sign-up session has expired. Please try again."
            : "Unable to continue with this provider. Please try again.",
        );
      })
      .finally(() => {
        if (active) setIsLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [isOAuthRegistration, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isOAuthRegistration && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (isOAuthRegistration) {
        if (!registrationTicket) {
          setError("Your secure sign-up session has expired. Please try again.");
          return;
        }
        await registerOAuth({
          registration_ticket: registrationTicket,
          full_name: emptyToNull(name),
          phone_number: emptyToNull(phoneNumber),
          occupation: emptyToNull(occupation),
        });
        clearOAuthRegistrationTicket();
      } else {
        await register({
          email,
          password,
          full_name: emptyToNull(name),
          phone_number: emptyToNull(phoneNumber),
          occupation: emptyToNull(occupation),
        });
      }
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.kind === "conflict") {
        setError("Registration could not be completed.");
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to create account. Please try again.",
      );
    }
  };

  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      {isOAuthRegistration ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Finish setting up your {provider ? `${provider[0].toUpperCase()}${provider.slice(1)}` : "provider"} account.
        </p>
      ) : null}
      <form className="w-full my-6" onSubmit={handleSubmit}>
        <FieldSet>
          <FieldGroup>
            <Field>
              <Input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                disabled={isLoading}
              />
            </Field>
            <Field>
              <Select
                value={occupation}
                onValueChange={setOccupation}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an occupation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Occupation</SelectLabel>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="nothing">Nothing</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Input
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                autoComplete="tel"
                disabled={isLoading}
              />
            </Field>
            <Field data-invalid={Boolean(error)}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(error)}
                readOnly={isOAuthRegistration}
                disabled={isLoading && !isOAuthRegistration}
                required
              />
            </Field>
            {!isOAuthRegistration ? (
              <>
                <Field data-invalid={Boolean(error)}>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field data-invalid={Boolean(error)}>
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    disabled={isLoading}
                    required
                  />
                  <FieldError>{error}</FieldError>
                </Field>
              </>
            ) : null}
            {isOAuthRegistration && error ? <FieldError>{error}</FieldError> : null}
            <Field>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Creating..."
                  : isOAuthRegistration
                    ? "Create account"
                    : "Create Account"}
              </Button>
            </Field>
            <Field className="text-center">
              <Link href="/auth">Already have an account?</Link>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}

function AuthPageFallback() {
  return (
    <section className="flex h-full items-center justify-center px-3 pb-9">
      <p className="text-sm text-muted-foreground">Loading registration...</p>
    </section>
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
