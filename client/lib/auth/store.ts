"use client";

import { create } from "zustand";

import { apiGet, apiPost } from "@/lib/api/client";
import { ApiError, mapApiError } from "@/lib/api/errors";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "@/lib/auth/tokenStorage";
import type { components } from "@/generated/api-types";

type LoginRequest = components["schemas"]["LoginRequest"];
type RegisterRequest = components["schemas"]["RegisterUserRequest"];
type OAuthRegisterRequest = components["schemas"]["OAuthRegisterRequest"];
type OAuthLoginExchangeRequest =
  components["schemas"]["OAuthLoginExchangeRequest"];
type User = components["schemas"]["UserResponse"];
type AccessTokenResponse = components["schemas"]["AccessTokenResponse"];
type LogoutRequest = components["schemas"]["LogoutRequest"];
type LogoutResponse = components["schemas"]["LogoutResponse"];
type RegisteredUserResponse = components["schemas"]["RegisteredUserResponse"];

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: ApiError | null;
  hydrate: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  registerOAuth: (request: OAuthRegisterRequest) => Promise<void>;
  completeOAuthLogin: (exchangeCode: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const LOGOUT_TIMEOUT_MS = 3_000;

let hydratePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  hydrate: async () => {
    const currentState = get();
    if (currentState.status === "authenticated" && currentState.user) {
      return;
    }
    if (hydratePromise) {
      return hydratePromise;
    }

    hydratePromise = (async () => {
      const tokens = getStoredTokens();
      if (!tokens) {
        set({ user: null, status: "unauthenticated", error: null });
        return;
      }

      set({ status: "loading", error: null });
      try {
        const user = await apiGet<User>("/api/v1/users/me");
        set({ user, status: "authenticated", error: null });
      } catch (error) {
        const apiError = error instanceof ApiError ? error : mapApiError(error);
        clearStoredTokens();
        set({ user: null, status: "unauthenticated", error: apiError });
      }
    })();

    try {
      await hydratePromise;
    } finally {
      hydratePromise = null;
    }
  },

  login: async (request) => {
    hydratePromise = null;
    set({ status: "loading", error: null });
    try {
      const tokens = await apiPost<LoginRequest, AccessTokenResponse>(
        "/api/v1/auth/login",
        request,
      );
      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      const user = await apiGet<User>("/api/v1/users/me");
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : mapApiError(error);
      clearStoredTokens();
      set({ user: null, status: "unauthenticated", error: apiError });
      throw apiError;
    }
  },

  register: async (request) => {
    hydratePromise = null;
    set({ status: "loading", error: null });
    try {
      await apiPost<RegisterRequest, RegisteredUserResponse>(
        "/api/v1/auth/register",
        request,
      );
      const tokens = await apiPost<LoginRequest, AccessTokenResponse>(
        "/api/v1/auth/login",
        {
          email: request.email,
          password: request.password,
        },
      );
      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      const user = await apiGet<User>("/api/v1/users/me");
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : mapApiError(error);
      clearStoredTokens();
      set({ user: null, status: "unauthenticated", error: apiError });
      throw apiError;
    }
  },

  registerOAuth: async (request) => {
    hydratePromise = null;
    set({ status: "loading", error: null });
    try {
      const tokens = await apiPost<OAuthRegisterRequest, AccessTokenResponse>(
        "/api/v1/auth/oauth/register",
        request,
      );
      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      const user = await apiGet<User>("/api/v1/users/me");
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : mapApiError(error);
      clearStoredTokens();
      set({ user: null, status: "unauthenticated", error: apiError });
      throw apiError;
    }
  },

  completeOAuthLogin: async (exchangeCode) => {
    hydratePromise = null;
    set({ status: "loading", error: null });
    try {
      const tokens = await apiPost<
        OAuthLoginExchangeRequest,
        AccessTokenResponse
      >("/api/v1/auth/oauth/exchange", { exchange_code: exchangeCode });
      setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      const user = await apiGet<User>("/api/v1/users/me");
      set({ user, status: "authenticated", error: null });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : mapApiError(error);
      clearStoredTokens();
      set({ user: null, status: "unauthenticated", error: apiError });
      throw apiError;
    }
  },

  logout: async () => {
    hydratePromise = null;
    const tokens = getStoredTokens();
    set({ status: "loading", error: null });
    try {
      if (tokens?.refreshToken) {
        await Promise.race([
          apiPost<LogoutRequest, LogoutResponse>("/api/v1/auth/logout", {
            refresh_token: tokens.refreshToken,
          }),
          timeoutAfter(LOGOUT_TIMEOUT_MS),
        ]);
      }
    } catch {
      // Local session cleanup should still win if the server rejects the token.
    } finally {
      clearStoredTokens();
      set({ user: null, status: "unauthenticated", error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

function timeoutAfter(milliseconds: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Operation timed out")), milliseconds);
  });
}
