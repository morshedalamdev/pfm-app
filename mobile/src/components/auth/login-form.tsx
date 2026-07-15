"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { AuthResponse } from "@/lib/api/types";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { useAuthStore } from "@/lib/auth/store";

type LoginFormProps = Readonly<{
  nextPath: string;
  serviceUnavailable?: boolean;
}>;

export function LoginForm({ nextPath, serviceUnavailable = false }: LoginFormProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify(values),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as
        | AuthResponse
        | { error?: { message?: string } };

      if (!response.ok || !("user" in payload)) {
        setError("root", {
          message:
            "error" in payload && payload.error?.message
              ? payload.error.message
              : "Unable to sign in",
        });
        return;
      }

      setUser(payload.user);
      router.replace(nextPath as Route);
      router.refresh();
    } catch {
      setError("root", { message: "Unable to reach the sign-in service" });
    }
  });

  return (
    <form className="auth-form" noValidate onSubmit={onSubmit}>
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
            placeholder="you@example.com"
            type="email"
            {...register("email")}
          />
        </span>
        {errors.email ? <small role="alert">{errors.email.message}</small> : null}
      </label>

      <label className="auth-field">
        <span>Password</span>
        <span className="auth-input-wrap">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            autoComplete="current-password"
            placeholder="Your password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </span>
        {errors.password ? <small role="alert">{errors.password.message}</small> : null}
      </label>

      {errors.root ? <p className="auth-error" role="alert">{errors.root.message}</p> : null}

      <button className="primary-auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-switch">
        New to PFM? <Link href={"/auth/register" as Route}>Create an account</Link>
      </p>
    </form>
  );
}
