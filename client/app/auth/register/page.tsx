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
import { useAuthStore } from "@/lib/auth/store";
import { ICONS } from "@/lib/imageConstant";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const [name, setName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === "loading";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register({
        email,
        password,
        full_name: emptyToNull(name),
        phone_number: emptyToNull(phoneNumber),
        occupation: emptyToNull(occupation),
      });
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
            <Field>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Account"}
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

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
