"use client";

import { Mail, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AuthResponse, OAuthRegistrationPreview } from "@/lib/api/types";
import {
  clearOAuthRegistrationTicket,
  getOAuthRegistrationTicket,
} from "@/lib/auth/oauth-client";
import { useAuthStore } from "@/lib/auth/store";

export function OAuthRegisterForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [preview, setPreview] = useState<OAuthRegistrationPreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      const registrationTicket = getOAuthRegistrationTicket();
      if (!registrationTicket) {
        setError("This OAuth registration session is invalid or expired.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/oauth/preview", {
          body: JSON.stringify({ registrationTicket }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as
          | OAuthRegistrationPreview
          | { error?: { message?: string } };
        if (!response.ok || !("provider" in payload)) {
          clearOAuthRegistrationTicket();
          setError("This OAuth registration session is invalid or expired.");
          return;
        }
        setPreview(payload);
        setFullName(payload.full_name);
      } catch {
        setError("The registration service is temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function createAccount() {
    const registrationTicket = getOAuthRegistrationTicket();
    if (!registrationTicket || !preview || !fullName.trim()) {
      setError("Enter your full name to create the account.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/oauth/register", {
        body: JSON.stringify({
          fullName: fullName.trim(),
          registrationTicket,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as
        | AuthResponse
        | { error?: { message?: string } };
      if (!response.ok || !("user" in payload)) {
        setError(
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "Unable to create your account",
        );
        return;
      }
      clearOAuthRegistrationTicket();
      setUser(payload.user);
      router.replace("/setup" as Route);
      router.refresh();
    } catch {
      setError("The registration service is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div aria-label="Loading OAuth profile" className="auth-spinner" role="status" />;
  }

  if (!preview) {
    return (
      <div className="auth-options">
        <p className="auth-error" role="alert">{error}</p>
        <p className="auth-switch"><Link href={"/auth" as Route}>Return to sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="auth-form auth-form--register">
      <p className="auth-notice" role="status">
        Finish setting up your {preview.provider === "github" ? "GitHub" : "Google"} account.
      </p>
      <label className="auth-field">
        <span>Full name</span>
        <span className="auth-input-wrap">
          <UserRound aria-hidden="true" size={18} />
          <input
            autoComplete="name"
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            type="text"
            value={fullName}
          />
        </span>
      </label>
      <label className="auth-field">
        <span>Email address</span>
        <span className="auth-input-wrap auth-input-wrap--readonly">
          <Mail aria-hidden="true" size={18} />
          <input readOnly type="email" value={preview.email} />
        </span>
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="primary-auth-button" disabled={isSubmitting} onClick={createAccount} type="button">
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
      <p className="auth-switch"><Link href={"/auth" as Route}>Use another sign-in method</Link></p>
    </div>
  );
}
