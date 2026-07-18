import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackendUrl } from "@/lib/api/config";
import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import type { EmailAuthRouteResponse } from "@/lib/api/types";
import { emailRouteSchema } from "@/lib/auth/schemas";
import { hasTrustedOrigin } from "@/lib/auth/server";

const emailRouteResponseSchema = z.object({
  destination: z.enum(["login", "register"]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = emailRouteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(apiError("Enter a valid email address"), {
      status: 422,
    });
  }

  try {
    const backendResponse = await fetch(getBackendUrl("/api/v1/auth/email-route"), {
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!backendResponse.ok) {
      const message = await getBackendErrorMessage(
        backendResponse,
        "Unable to check your account",
      );
      return NextResponse.json(apiError(message), {
        status: backendResponse.status,
      });
    }

    const destination = emailRouteResponseSchema.safeParse(
      await backendResponse.json(),
    );
    if (!destination.success) {
      return NextResponse.json(apiError("Unable to check your account"), {
        status: 502,
      });
    }

    return NextResponse.json<EmailAuthRouteResponse>(destination.data);
  } catch {
    return NextResponse.json(apiError("Unable to check your account"), {
      status: 502,
    });
  }
}
