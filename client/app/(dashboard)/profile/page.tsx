"use client";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/generated/api-types";
import { apiPatch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/auth/store";
import { SquarePenIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type User = components["schemas"]["UserResponse"];
type UserUpdateRequest = components["schemas"]["UserUpdateRequest"];

const OCCUPATION_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "job", label: "Job" },
  { value: "business", label: "Business" },
  { value: "nothing", label: "Nothing" },
];

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [about, setAbout] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = status === "loading" && !user;

  useEffect(() => {
    if (status === "idle") {
      void hydrate();
    }
  }, [hydrate, status]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFullName(user.full_name ?? "");
    setEmail(user.email);
    setPhoneNumber(user.phone_number ?? "");
    setOccupation(user.occupation ?? "");
    setAbout(user.about ?? "");
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const updatedUser = await apiPatch<UserUpdateRequest, User>(
        "/api/v1/users/me",
        {
          email,
          full_name: emptyToNull(fullName),
          phone_number: emptyToNull(phoneNumber),
          occupation: emptyToNull(occupation),
          about: emptyToNull(about),
        },
      );
      useAuthStore.setState({ user: updatedUser });
      setMessage("Profile updated.");
    } catch (err) {
      if (err instanceof ApiError && err.kind === "conflict") {
        setError("That email address is already in use.");
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex flex-col h-dvh">
      <Header title="Profile" homeBtn={true}>
        <BackBtn />
      </Header>
      <section className="px-3 space-y-3 mt-5">
        <form onSubmit={handleSubmit}>
          <FieldSet>
            <FieldGroup>
              <div className="flex flex-col items-center gap-3">
                <div className="relative size-20 rounded-full">
                  <Skeleton className="size-20 rounded-full" />
                  <label
                    htmlFor="profileImage"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1"
                  >
                    <SquarePenIcon className="size-3.5" />
                  </label>
                  <input
                    type="file"
                    id="profileImage"
                    className="hidden"
                    disabled
                  />
                </div>
                <p className="font-medium">Change your photo</p>
              </div>
              <Field>
                <InputGroup>
                  <InputGroupInput
                    placeholder="Full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    disabled={isLoading || isSaving}
                  />
                  <InputGroupAddon className="text-white font-bold">
                    Name:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field data-invalid={Boolean(error)}>
                <InputGroup>
                  <InputGroupInput
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    disabled={isLoading || isSaving}
                    aria-invalid={Boolean(error)}
                    required
                  />
                  <InputGroupAddon className="text-white font-bold">
                    Email:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{error}</FieldError>
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupInput
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    autoComplete="tel"
                    disabled={isLoading || isSaving}
                  />
                  <InputGroupAddon className="text-white font-bold">
                    Phone:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <Select
                    value={occupation}
                    onValueChange={setOccupation}
                    disabled={isLoading || isSaving}
                  >
                    <SelectTrigger className="border-0">
                      <SelectValue placeholder="Select an occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Occupation</SelectLabel>
                        {OCCUPATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <InputGroupAddon className="text-white font-bold">
                    Occupation:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupTextarea
                    placeholder="Write something about yourself"
                    className="pt-0"
                    value={about}
                    onChange={(event) => setAbout(event.target.value)}
                    disabled={isLoading || isSaving}
                  />
                  <InputGroupAddon
                    align="block-start"
                    className="text-white font-bold"
                  >
                    About Me
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              {message ? (
                <p className="text-sm font-medium text-primary">{message}</p>
              ) : null}
              <Field>
                <Button type="submit" disabled={isLoading || isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </main>
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
