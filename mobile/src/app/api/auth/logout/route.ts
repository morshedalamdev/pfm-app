import { NextRequest, NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/api/config";
import { apiError } from "@/lib/api/errors";
import {
  clearSessionCookies,
  hasTrustedOrigin,
  readSessionTokens,
} from "@/lib/auth/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), { status: 403 });
  }

  const { refreshToken } = readSessionTokens(request);
  if (refreshToken) {
    try {
      await fetch(getBackendUrl("/api/v1/auth/logout"), {
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } catch {
      // The local session must still be cleared if the API is unavailable.
    }
  }

  const response = NextResponse.json({ status: "ok" });
  clearSessionCookies(response);
  return response;
}
