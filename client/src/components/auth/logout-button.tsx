"use client";

import { LogOut } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthStore } from "@/lib/auth/store";

export function LogoutButton() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    setIsPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      router.replace("/auth" as Route);
      router.refresh();
    }
  }

  return (
    <button className="logout-button" disabled={isPending} onClick={logout} type="button">
      <LogOut aria-hidden="true" size={18} />
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
