import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackendUrl } from "@/lib/api/config";

export const ACCESS_COOKIE = "pfm_mobile_access";
export const REFRESH_COOKIE = "pfm_mobile_refresh";

const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_SINGLE_FLIGHT_TTL_MS = 1_000;
const refreshFlights = new Map<string, Promise<AuthTokens | null>>();

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
});

const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  full_name: z.string().nullable(),
  phone_number: z.string().nullable(),
  occupation: z.string().nullable(),
  about: z.string().nullable(),
  base_currency: z.string().length(3),
  base_currency_changed_at: z.string().nullable(),
  home_balance_source_type: z.enum(["account", "budget"]).nullable(),
  home_balance_source_id: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type AuthTokens = z.infer<typeof tokenSchema>;
export type SessionUser = z.infer<typeof userSchema>;

type SessionTokens = Readonly<{
  accessToken: string | null;
  refreshToken: string | null;
}>;

type AuthenticatedFetchResult = Readonly<{
  clearSession: boolean;
  response: Response;
  updatedTokens: AuthTokens | null;
}>;

export function readSessionTokens(request: NextRequest): SessionTokens {
  return {
    accessToken: request.cookies.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value ?? null,
  };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function applySessionCookies(
  response: NextResponse,
  tokens: AuthTokens,
): void {
  response.cookies.set(
    ACCESS_COOKIE,
    tokens.access_token,
    cookieOptions(tokens.expires_in),
  );
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    cookieOptions(REFRESH_MAX_AGE_SECONDS),
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

export function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
}

export async function requestTokens(
  path:
    | "/api/v1/auth/login"
    | "/api/v1/auth/oauth/exchange"
    | "/api/v1/auth/oauth/register"
    | "/api/v1/auth/refresh",
  payload: object,
): Promise<{ response: Response; tokens: AuthTokens | null }> {
  const response = await fetch(getBackendUrl(path), {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return { response, tokens: null };
  }

  const parsed = tokenSchema.safeParse(await response.clone().json());
  return { response, tokens: parsed.success ? parsed.data : null };
}

export async function fetchSessionUser(accessToken: string): Promise<Response> {
  return fetch(getBackendUrl("/api/v1/users/me"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export async function parseSessionUser(response: Response): Promise<SessionUser | null> {
  if (!response.ok) {
    return null;
  }

  const parsed = userSchema.safeParse(await response.clone().json());
  return parsed.success ? parsed.data : null;
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  const existing = refreshFlights.get(refreshToken);
  if (existing) return existing;

  const flight = requestTokens("/api/v1/auth/refresh", {
    refresh_token: refreshToken,
  }).then(({ tokens }) => tokens);
  refreshFlights.set(refreshToken, flight);

  void flight.then(
    (tokens) => {
      if (!tokens) {
        refreshFlights.delete(refreshToken);
        return;
      }
      const timer = setTimeout(() => {
        if (refreshFlights.get(refreshToken) === flight) {
          refreshFlights.delete(refreshToken);
        }
      }, REFRESH_SINGLE_FLIGHT_TTL_MS);
      timer.unref();
    },
    () => refreshFlights.delete(refreshToken),
  );
  return flight;
}

function unauthorizedResponse(): Response {
  return Response.json(
    { error: { message: "Authentication required" } },
    { status: 401 },
  );
}

async function fetchWithAccessToken(
  path: string,
  accessToken: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);

  return fetch(getBackendUrl(path), {
    ...init,
    cache: "no-store",
    headers,
  });
}

export async function authenticatedBackendFetch(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<AuthenticatedFetchResult> {
  const session = readSessionTokens(request);
  let accessToken = session.accessToken;
  let updatedTokens: AuthTokens | null = null;

  if (!accessToken && session.refreshToken) {
    updatedTokens = await refreshTokens(session.refreshToken);
    accessToken = updatedTokens?.access_token ?? null;
  }

  if (!accessToken) {
    return {
      clearSession: Boolean(session.accessToken || session.refreshToken),
      response: unauthorizedResponse(),
      updatedTokens: null,
    };
  }

  let response = await fetchWithAccessToken(path, accessToken, init);

  if (response.status === 401 && session.refreshToken && !updatedTokens) {
    updatedTokens = await refreshTokens(session.refreshToken);
    if (updatedTokens) {
      response = await fetchWithAccessToken(path, updatedTokens.access_token, init);
    }
  }

  const clearSession = response.status === 401;
  return {
    clearSession,
    response,
    updatedTokens: clearSession ? null : updatedTokens,
  };
}

export function applySessionResult(
  response: NextResponse,
  result: AuthenticatedFetchResult,
): void {
  if (result.updatedTokens) {
    applySessionCookies(response, result.updatedTokens);
  } else if (result.clearSession) {
    clearSessionCookies(response);
  }
}
