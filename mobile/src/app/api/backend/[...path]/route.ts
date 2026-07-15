import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import {
  applySessionResult,
  authenticatedBackendFetch,
  hasTrustedOrigin,
} from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const RESPONSE_HEADERS = [
  "content-disposition",
  "content-length",
  "content-type",
] as const;

async function proxyBackend(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  if (!["GET", "HEAD"].includes(request.method) && !hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), { status: 403 });
  }

  const { path } = await context.params;
  if (!path.length) {
    return NextResponse.json(apiError("Backend path is required"), { status: 400 });
  }

  const encodedPath = path.map((part) => encodeURIComponent(part)).join("/");
  const backendPath = `/api/v1/${encodedPath}${request.nextUrl.search}`;
  const headers = new Headers();

  for (const name of ["accept", "content-type", "idempotency-key", "last-event-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  try {
    const result = await authenticatedBackendFetch(request, backendPath, {
      body: hasBody ? await request.arrayBuffer() : undefined,
      headers,
      method: request.method,
    });
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = result.response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const response = new NextResponse(result.response.body, {
      headers: responseHeaders,
      status: result.response.status,
    });
    applySessionResult(response, result);
    return response;
  } catch {
    return NextResponse.json(apiError("Backend service is unavailable"), {
      status: 502,
    });
  }
}

export const GET = proxyBackend;
export const POST = proxyBackend;
export const PUT = proxyBackend;
export const PATCH = proxyBackend;
export const DELETE = proxyBackend;
