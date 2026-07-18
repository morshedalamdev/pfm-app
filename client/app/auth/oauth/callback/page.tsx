"use client";

import { ApiError } from "@/lib/api/errors";
import {
  storeOAuthRegistrationTicket,
} from "@/lib/auth/oauth";
import { useAuthStore } from "@/lib/auth/store";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeOAuthLogin = useAuthStore((state) => state.completeOAuthLogin);
  const [message, setMessage] = useState("Completing secure sign in...");

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      setMessage("We could not complete that sign in. Please try again.");
      return;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    const registrationTicket = params.get("registration_ticket");
    const exchangeCode = params.get("exchange_code");
    window.history.replaceState(null, "", window.location.pathname);

    if (registrationTicket) {
      storeOAuthRegistrationTicket(registrationTicket);
      router.replace("/auth/register?oauth=1");
      return;
    }

    if (!exchangeCode) {
      setMessage("Your secure sign-in session is missing or has expired.");
      return;
    }

    void completeOAuthLogin(exchangeCode)
      .then(() => router.replace("/"))
      .catch((error) => {
        setMessage(
          error instanceof ApiError && error.kind === "unauthorized"
            ? "Your secure sign-in session has expired. Please try again."
            : "We could not complete that sign in. Please try again.",
        );
      });
  }, [completeOAuthLogin, router, searchParams]);

  const isError = !message.startsWith("Completing");
  return (
    <section className="flex h-full flex-col items-center justify-center px-5 pb-9 text-center">
      <Image src={ICONS.RedIcon} alt="PFM" width={62} height={62} />
      <h1 className="mt-5 text-2xl font-bold">Secure sign in</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground" role={isError ? "alert" : "status"}>
        {message}
      </p>
      {isError ? (
        <Link className="mt-6 font-semibold underline underline-offset-4" href="/auth">
          Return to sign in
        </Link>
      ) : null}
    </section>
  );
}

function OAuthCallbackFallback() {
  return (
    <section className="flex h-full items-center justify-center px-5 pb-9">
      <p className="text-sm text-muted-foreground">Completing secure sign in...</p>
    </section>
  );
}
