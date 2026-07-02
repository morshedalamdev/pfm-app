"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/store";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === "loading";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login({ email, password });
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.replace(isSafeNextPath(nextPath) ? nextPath : "/");
    } catch (err) {
      if (err instanceof ApiError && err.kind === "unauthorized") {
        setError("Invalid email or password.");
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to log in. Please try again.",
      );
    }
  };

  return (
    <section className="flex flex-col items-center justify-center h-full px-3 pb-9">
      <Image src={ICONS.RedIcon} alt="Red Icon" width={62} height={62} />
      <form className="w-full my-6" onSubmit={handleSubmit}>
        <FieldSet>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(error)}
                disabled={isLoading}
                required
              />
            </Field>
            <Field data-invalid={Boolean(error)}>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                disabled={isLoading}
                required
              />
              <FieldError>{error}</FieldError>
            </Field>
            <Field>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </Field>
            <Field className="text-center">
              <Link href="/auth/forgot-password">Forgot Password?</Link>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </section>
  );
}

function isSafeNextPath(path: string | null): path is string {
  return Boolean(path?.startsWith("/") && !path.startsWith("//"));
}
