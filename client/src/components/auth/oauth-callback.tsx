"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AuthResponse } from "@/lib/api/types";
import { storeOAuthRegistrationTicket } from "@/lib/auth/oauth-client";
import { useAuthStore } from "@/lib/auth/store";

export function OAuthCallback() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      window.history.replaceState(null, "", window.location.pathname);

      if (query.has("error")) {
        setError(query.get("error") === "link_required"
          ? "This provider is not connected yet. Sign in with an existing method, then connect it from Settings → Sign-in & security."
          : "We could not complete that sign in. Please try again.");
        return;
      }

      const registrationTicket = fragment.get("registration_ticket");
      if (registrationTicket) {
        storeOAuthRegistrationTicket(registrationTicket);
        router.replace("/auth/register?oauth=1" as Route);
        return;
      }

      const exchangeCode = fragment.get("exchange_code");
      if (!exchangeCode) {
        setError("This OAuth sign in session is invalid or expired.");
        return;
      }

      try {
        const response = await fetch("/api/auth/oauth/exchange", {
          body: JSON.stringify({ exchangeCode }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json()) as
          | AuthResponse
          | { error?: { message?: string } };
        if (!response.ok || !("user" in payload)) {
          setError("We could not complete that sign in. Please try again.");
          return;
        }
        setUser(payload.user);
        router.replace("/" as Route);
        router.refresh();
      } catch {
        setError("The sign in service is temporarily unavailable.");
      }
    })();
  }, [router, setUser]);

  return (
    <div className="oauth-callback-state">
      <div className="auth-panel-heading">
        <p className="eyebrow">SECURE SIGN IN</p>
        <h1>{error ? "Sign in not completed" : "Completing sign in…"}</h1>
        <p>{error ?? "Verifying your provider account securely."}</p>
      </div>
      {error ? (
        <p className="auth-switch"><Link href={"/auth" as Route}>Return to sign in</Link></p>
      ) : (
        <div aria-label="Completing sign in" className="auth-spinner" role="status" />
      )}
    </div>
  );
}
