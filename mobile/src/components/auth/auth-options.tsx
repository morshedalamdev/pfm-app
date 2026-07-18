"use client";

import { Github, Mail } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { beginOAuth, type OAuthProvider } from "@/lib/auth/oauth-client";
import type { EmailAuthRouteResponse } from "@/lib/api/types";

type AuthOptionsProps = Readonly<{
  defaultEmail?: string;
  nextPath: string;
  serviceUnavailable?: boolean;
}>;

const emailSchema = z.string().trim().email("Enter a valid email address").max(320);

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.7-2.4L15.5 17c-.9.6-2 1-3.5 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.5 13.9a6 6 0 0 1 0-3.8V7.4H3.2a10 10 0 0 0 0 9.2l3.3-2.7Z" fill="#FBBC05" />
      <path d="M12 6c1.6 0 3 .5 4.2 1.6l3.1-3.1A10 10 0 0 0 3.2 7.4l3.3 2.7A5.9 5.9 0 0 1 12 6Z" fill="#EA4335" />
    </svg>
  );
}

export function AuthOptions({
  defaultEmail = "",
  nextPath,
  serviceUnavailable = false,
}: AuthOptionsProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [isRoutingEmail, setIsRoutingEmail] = useState(false);

  async function continueWithEmail() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }

    setError(null);
    setIsRoutingEmail(true);
    try {
      const response = await fetch("/api/auth/email-route", {
        body: JSON.stringify({ email: parsed.data }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as
        | EmailAuthRouteResponse
        | { error?: { message?: string } };

      if (!response.ok || !("destination" in payload)) {
        setError(
          "error" in payload && payload.error?.message
            ? payload.error.message
            : "Unable to check your account",
        );
        return;
      }

      const query = new URLSearchParams({ email: parsed.data });
      if (payload.destination === "login") query.set("next", nextPath);
      router.push(`/auth/${payload.destination}?${query.toString()}` as Route);
    } catch {
      setError("Unable to check your account");
    } finally {
      setIsRoutingEmail(false);
    }
  }

  function continueWithProvider(provider: OAuthProvider) {
    beginOAuth(provider, nextPath);
  }

  const registrationQuery = new URLSearchParams();
  if (email.trim()) registrationQuery.set("email", email.trim());
  const registrationHref = `/auth/register${registrationQuery.size ? `?${registrationQuery.toString()}` : ""}` as Route;

  return (
    <div className="auth-options">
      {serviceUnavailable ? (
        <p className="auth-notice" role="status">
          Your session could not be checked. Please sign in again.
        </p>
      ) : null}

      <label className="auth-field">
        <span>Email address</span>
        <span className="auth-input-wrap">
          <Mail aria-hidden="true" size={18} />
          <input
            autoComplete="email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void continueWithEmail();
            }}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </span>
        {error ? <small role="alert">{error}</small> : null}
      </label>

      <button
        className="primary-auth-button"
        disabled={isRoutingEmail}
        onClick={() => void continueWithEmail()}
        type="button"
      >
        {isRoutingEmail ? "Checking account…" : "Continue with email"}
      </button>

      <p className="auth-switch">
        New to PFM? <Link href={registrationHref}>Create an account</Link>
      </p>

      <div className="auth-divider"><span>or</span></div>

      <button className="oauth-button" onClick={() => continueWithProvider("google")} type="button">
        <GoogleIcon />
        Continue with Google
      </button>
      <button className="oauth-button" onClick={() => continueWithProvider("github")} type="button">
        <Github aria-hidden="true" size={21} />
        Continue with GitHub
      </button>
    </div>
  );
}
