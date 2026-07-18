import { NextRequest, NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/api/config";
import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import type { AuthResponse, RegisterUserRequest } from "@/lib/api/types";
import { registerSchema } from "@/lib/auth/schemas";
import {
  applySessionCookies,
  fetchSessionUser,
  hasTrustedOrigin,
  parseSessionUser,
  requestTokens,
} from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(apiError("Check your registration details"), {
      status: 422,
    });
  }

  const registration: RegisterUserRequest = {
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    password: parsed.data.password,
  };

  try {
    const registrationResponse = await fetch(getBackendUrl("/api/v1/auth/register"), {
      body: JSON.stringify(registration),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!registrationResponse.ok) {
      const message = await getBackendErrorMessage(
        registrationResponse,
        "Registration is temporarily unavailable",
      );
      return NextResponse.json(apiError(message), {
        status: registrationResponse.status,
      });
    }

    const { response: tokenResponse, tokens } = await requestTokens(
      "/api/v1/auth/login",
      { email: parsed.data.email, password: parsed.data.password },
    );

    if (!tokens) {
      return NextResponse.json(apiError("Account created. Please sign in."), {
        status: tokenResponse.ok || tokenResponse.status >= 500 ? 502 : 401,
      });
    }

    const userResponse = await fetchSessionUser(tokens.access_token);
    const user = await parseSessionUser(userResponse);
    if (!user) {
      return NextResponse.json(apiError("Unable to load your account"), {
        status: 502,
      });
    }

    const response = NextResponse.json<AuthResponse>({ user }, { status: 201 });
    applySessionCookies(response, tokens);
    return response;
  } catch {
    return NextResponse.json(apiError("Registration is temporarily unavailable"), {
      status: 502,
    });
  }
}
