import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import type { SessionResponse } from "@/lib/api/types";
import {
  applySessionResult,
  authenticatedBackendFetch,
  parseSessionUser,
} from "@/lib/auth/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await authenticatedBackendFetch(
      request,
      "/api/v1/users/me",
    );
    const user = await parseSessionUser(result.response);

    if (!user) {
      const response = NextResponse.json<SessionResponse>({ user: null });
      applySessionResult(response, result);
      return response;
    }

    const response = NextResponse.json<SessionResponse>({ user });
    applySessionResult(response, result);
    return response;
  } catch {
    return NextResponse.json(apiError("Session service is unavailable"), {
      status: 502,
    });
  }
}
