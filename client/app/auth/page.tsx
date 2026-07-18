"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { beginOAuthSignIn, type OAuthProvider } from "@/lib/auth/oauth";
import { ICONS } from "@/lib/imageConstant";
import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useState } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providerLoading, setProviderLoading] = useState<OAuthProvider | null>(
    null,
  );
  const nextPath = searchParams.get("next");

  const continueWithEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address to continue.");
      return;
    }

    const query = new URLSearchParams({ email: normalizedEmail });
    if (isSafeNextPath(nextPath)) {
      query.set("next", nextPath);
    }
    router.push(`/auth/login?${query.toString()}`);
  };

  const continueWithProvider = (provider: OAuthProvider) => {
    setError(null);
    setProviderLoading(provider);
    try {
      beginOAuthSignIn(provider);
    } catch (oauthError) {
      setProviderLoading(null);
      setError(
        oauthError instanceof Error
          ? oauthError.message
          : "Unable to start secure sign in. Please try again.",
      );
    }
  };

  const registrationHref = email.trim()
    ? `/auth/register?email=${encodeURIComponent(email.trim())}`
    : "/auth/register";

  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <div className="text-center space-y-3">
        <Image
          src={ICONS.RedIcon}
          alt="Red Icon"
          width={62}
          height={62}
          className="mx-auto"
        />
        <h3 className="font-bold text-4xl tracking-wide">Welcome Back</h3>
        <h2 className="font-semibold text-xl">Log in or sign up</h2>
      </div>
      <form className="w-full my-6" onSubmit={continueWithEmail}>
        <FieldSet>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(error)}
                required
              />
            </Field>
            <Field>
              <Button type="submit" disabled={providerLoading !== null}>
                Continue with email
              </Button>
            </Field>
            {error ? <p className="text-destructive text-center text-sm" role="alert">{error}</p> : null}
            <p className="text-center text-sm text-muted-foreground">
              New to PFM? <Link className="font-semibold text-foreground underline underline-offset-4" href={registrationHref}>Create an account</Link>
            </p>
            <FieldSeparator>or</FieldSeparator>
            <Field>
              <Button
                type="button"
                variant="outline"
                onClick={() => continueWithProvider("google")}
                disabled={providerLoading !== null}
              >
                <Image
                  src={ICONS.GoogleIcon}
                  alt="Google Icon"
                  width={24}
                  height={24}
                />
                {providerLoading === "google" ? "Connecting to Google..." : "Continue with Google"}
              </Button>
            </Field>
            <Field>
              <Button
                type="button"
                variant="outline"
                onClick={() => continueWithProvider("github")}
                disabled={providerLoading !== null}
              >
                <Github aria-hidden="true" className="size-5" />
                {providerLoading === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}
              </Button>
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
      <p className="text-sm text-muted-foreground">Loading sign in...</p>
    </section>
  );
}

function isSafeNextPath(path: string | null): path is string {
  return Boolean(path?.startsWith("/") && !path.startsWith("//"));
}
