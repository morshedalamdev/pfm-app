"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import type { AuthResponse } from "@/lib/api/types";
import { registerSchema, type RegisterValues } from "@/lib/auth/schemas";
import { useAuthStore } from "@/lib/auth/store";

const fields = [
  {
    autoComplete: "name",
    icon: UserRound,
    label: "Full name",
    name: "fullName" as const,
    placeholder: "Your full name",
    type: "text",
  },
  {
    autoComplete: "email",
    icon: Mail,
    label: "Email address",
    name: "email" as const,
    placeholder: "you@example.com",
    type: "email",
  },
  {
    autoComplete: "new-password",
    icon: LockKeyhole,
    label: "Password",
    name: "password" as const,
    placeholder: "At least 12 characters",
    type: "password",
  },
  {
    autoComplete: "new-password",
    icon: LockKeyhole,
    label: "Confirm password",
    name: "confirmPassword" as const,
    placeholder: "Repeat your password",
    type: "password",
  },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      fullName: "",
      password: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/auth/register", {
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
              : "Unable to create your account",
        });
        return;
      }

      setUser(payload.user);
      router.replace("/");
      router.refresh();
    } catch {
      setError("root", { message: "Unable to reach the registration service" });
    }
  });

  return (
    <form className="auth-form auth-form--register" noValidate onSubmit={onSubmit}>
      {fields.map(({ autoComplete, icon: Icon, label, name, placeholder, type }) => (
        <label className="auth-field" key={name}>
          <span>{label}</span>
          <span className="auth-input-wrap">
            <Icon aria-hidden="true" size={18} />
            <input
              autoComplete={autoComplete}
              inputMode={name === "email" ? "email" : undefined}
              placeholder={placeholder}
              type={type}
              {...register(name)}
            />
          </span>
          {errors[name] ? <small role="alert">{errors[name]?.message}</small> : null}
        </label>
      ))}

      <p className="password-hint">
        Use 12+ characters with uppercase, lowercase, and a number.
      </p>

      {errors.root ? <p className="auth-error" role="alert">{errors.root.message}</p> : null}

      <button className="primary-auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="auth-switch">
        Already have an account? <Link href={"/auth/login" as Route}>Sign in</Link>
      </p>
    </form>
  );
}
