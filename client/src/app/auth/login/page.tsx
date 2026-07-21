import Link from "next/link";
import type { Route } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

type LoginPageProps = {
  searchParams: Promise<{ email?: string; next?: string; password_updated?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <>
      <div className="auth-panel-heading">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to your money</h1>
        <p>Continue to your private finance overview.</p>
      </div>
      <LoginForm
        defaultEmail={params.email}
        nextPath={getSafeNextPath(params.next)}
        passwordUpdated={params.password_updated === "1"}
        serviceUnavailable={params.reason === "unavailable"}
      />
      <p className="auth-legal">
        By continuing, you agree to keep your account credentials private. <Link href={"/auth" as Route}>Other sign-in options</Link>
      </p>
    </>
  );
}
