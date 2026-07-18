"use client";

import { useEffect } from "react";

import type { AuthResponse } from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/store";

export function SessionHydrator() {
  useEffect(() => {
    const controller = new AbortController();

    async function hydrateSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          useAuthStore.getState().setAnonymous();
          return;
        }

        const payload = (await response.json()) as AuthResponse;
        useAuthStore.getState().setUser(payload.user);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          useAuthStore.getState().setAnonymous();
        }
      }
    }

    void hydrateSession();
    return () => controller.abort();
  }, []);

  return null;
}
