// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as registerUser } from "@/app/api/auth/register/route";
import { GET as proxyBackendGet } from "@/app/api/backend/[...path]/route";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/auth/server";
import { proxy } from "@/proxy";

const tokens = {
  access_token: "access-token-value",
  expires_in: 900,
  refresh_token: "refresh-token-value",
  token_type: "bearer",
};

const user = {
  about: null,
  base_currency: "USD",
  base_currency_changed_at: null,
  created_at: "2026-07-15T00:00:00Z",
  email: "mobile@example.com",
  full_name: "Mobile User",
  home_balance_source_id: null,
  home_balance_source_type: null,
  id: "11111111-1111-1111-1111-111111111111",
  is_active: true,
  occupation: null,
  phone_number: null,
};

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("auth server boundary", () => {
  it("sets HTTP-only cookies without exposing tokens in the login response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(tokens))
      .mockResolvedValueOnce(jsonResponse(user));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/auth/login", {
      body: JSON.stringify({
        email: "mobile@example.com",
        password: "CorrectHorse42",
      }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      method: "POST",
    });
    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ user });
    expect(JSON.stringify(body)).not.toContain(tokens.access_token);
    expect(JSON.stringify(body)).not.toContain(tokens.refresh_token);
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      value: tokens.access_token,
    });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      value: tokens.refresh_token,
    });
  });

  it("registers, signs in, and returns only the user profile", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: user.id }, 201))
      .mockResolvedValueOnce(jsonResponse(tokens))
      .mockResolvedValueOnce(jsonResponse(user));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/auth/register", {
      body: JSON.stringify({
        confirmPassword: "CorrectHorse42",
        email: "mobile@example.com",
        fullName: "Mobile User",
        password: "CorrectHorse42",
      }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      method: "POST",
    });
    const response = await registerUser(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ user });
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe(tokens.access_token);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects cross-origin authentication requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/auth/login", {
      body: JSON.stringify({
        email: "mobile@example.com",
        password: "CorrectHorse42",
      }),
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      method: "POST",
    });
    const response = await login(request);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a malformed successful token response as an upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));

    const request = new NextRequest("http://localhost/api/auth/login", {
      body: JSON.stringify({
        email: "mobile@example.com",
        password: "CorrectHorse42",
      }),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      method: "POST",
    });
    const response = await login(request);

    expect(response.status).toBe(502);
    expect(response.cookies.get(ACCESS_COOKIE)).toBeUndefined();
  });

  it("redirects an anonymous protected request to a safe login URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(new NextRequest("http://localhost/report?period=month"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/login?next=%2Freport%3Fperiod%3Dmonth",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token before allowing a protected route", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
      .mockResolvedValueOnce(jsonResponse(tokens))
      .mockResolvedValueOnce(jsonResponse(user));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/", {
      headers: {
        cookie: `${ACCESS_COOKIE}=expired; ${REFRESH_COOKIE}=valid-refresh`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe(tokens.access_token);
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe(tokens.refresh_token);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears rotated tokens if the refreshed session is still unauthorized", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
      .mockResolvedValueOnce(jsonResponse(tokens))
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/", {
      headers: {
        cookie: `${ACCESS_COOKIE}=expired; ${REFRESH_COOKIE}=valid-refresh`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });

  it("forwards backend requests with server-owned bearer credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ currency: "USD", total_amount: "42.00" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/backend/reports/dashboard?period=month",
      { headers: { cookie: `${ACCESS_COOKIE}=valid-access` } },
    );
    const response = await proxyBackendGet(request, {
      params: Promise.resolve({ path: ["reports", "dashboard"] }),
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      currency: "USD",
      total_amount: "42.00",
    });
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer valid-access",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:8000/api/v1/reports/dashboard?period=month",
    );
  });
});
