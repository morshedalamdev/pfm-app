import { NextRequest, NextResponse } from "next/server";

import {
  applySessionResult,
  authenticatedBackendFetch,
} from "@/lib/auth/server";

function loginRedirect(request: NextRequest, reason?: string): NextResponse {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_AUTH_BYPASS === "1"
  ) {
    return NextResponse.next();
  }

  try {
    const result = await authenticatedBackendFetch(
      request,
      "/api/v1/users/me",
    );

    if (!result.response.ok) {
      const response = loginRedirect(request);
      applySessionResult(response, result);
      return response;
    }

    const response = NextResponse.next();
    applySessionResult(response, result);
    return response;
  } catch {
    return loginRedirect(request, "unavailable");
  }
}

export const config = {
  matcher: ["/", "/report/:path*", "/plan/:path*", "/settings/:path*"],
};
