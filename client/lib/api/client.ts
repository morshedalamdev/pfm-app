import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { mapApiError } from "@/lib/api/errors";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "@/lib/auth/tokenStorage";
import type { components, paths } from "@/generated/api-types";

export type ApiPath = keyof paths;
type RefreshRequest = components["schemas"]["RefreshTokenRequest"];
type RefreshResponse = components["schemas"]["AccessTokenResponse"];

declare global {
  interface Window {
    __PFM_RUNTIME_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest(originalRequest)
    ) {
      throw error;
    }

    originalRequest._retry = true;
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      throw error;
    }

    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${accessToken}`,
    };
    return apiClient(originalRequest);
  },
);

export async function apiGet<TResponse>(
  path: ApiPath,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await apiClient.get(path, config);
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function apiPost<TBody, TResponse>(
  path: ApiPath,
  body: TBody,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await apiClient.post(path, body, config);
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function apiPatch<TBody, TResponse>(
  path: ApiPath,
  body: TBody,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await apiClient.patch(path, body, config);
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function apiDelete<TResponse>(
  path: ApiPath,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await apiClient.delete(path, config);
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function requestTokenRefresh(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    clearStoredTokens();
    return null;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      {
        refresh_token: tokens.refreshToken,
      } satisfies RefreshRequest,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );
    setStoredTokens({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    });
    return response.data.access_token;
  } catch {
    clearStoredTokens();
    return null;
  }
}

function isAuthRequest(config: AxiosRequestConfig): boolean {
  const url = config.url ?? "";
  return url.includes("/api/v1/auth/");
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const runtimeApiBaseUrl = window.__PFM_RUNTIME_CONFIG__?.apiBaseUrl?.trim();
    if (runtimeApiBaseUrl) {
      return runtimeApiBaseUrl.replace(/\/$/, "");
    }
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
}
