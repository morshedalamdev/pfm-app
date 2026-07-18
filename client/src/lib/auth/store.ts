"use client";

import { create } from "zustand";

import type { User } from "@/lib/api/types";

type AuthStatus = "checking" | "authenticated" | "anonymous";

type AuthState = {
  status: AuthStatus;
  user: User | null;
  clearSession: () => void;
  setAnonymous: () => void;
  setUser: (user: User) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "checking",
  user: null,
  clearSession: () => set({ status: "anonymous", user: null }),
  setAnonymous: () => set({ status: "anonymous", user: null }),
  setUser: (user) => set({ status: "authenticated", user }),
}));
