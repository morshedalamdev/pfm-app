import { NextRequest, NextResponse } from "next/server";

import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import type { AuthResponse } from "@/lib/api/types";
import { oauthRegisterSchema } from "@/lib/auth/schemas";
import {
  applySessionCookies,
  fetchSessionUser,
  hasTrustedOrigin,
  parseSessionUser,
  requestTokens,
} from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), {
      status: 403,
    });
  }

  const payload = await request.json().catch(() => null);
  const parsed = oauthRegisterSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(apiError("Check your registration details"), {
      status: 422,
    });
  }

  try {
    const { response: tokenResponse, tokens } = await requestTokens(
      "/api/v1/auth/oauth/register",
      {
        full_name: parsed.data.fullName,
        registration_ticket: parsed.data.registrationTicket,
      },
    );
    if (!tokens) {
      const message = await getBackendErrorMessage(
        tokenResponse,
        "OAuth registration is temporarily unavailable",
      );
      return NextResponse.json(apiError(message), {
        status: tokenResponse.ok ? 502 : tokenResponse.status,
      });
    }

    const user = await parseSessionUser(
      await fetchSessionUser(tokens.access_token),
    );
    if (!user) {
      return NextResponse.json(apiError("Unable to load your account"), {
        status: 502,
      });
    }

    const response = NextResponse.json<AuthResponse>({ user }, { status: 201 });
    applySessionCookies(response, tokens);
    return response;
  } catch {
    return NextResponse.json(
      apiError("OAuth registration is temporarily unavailable"),
      { status: 502 },
    );
  }
}
