import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import { passwordUpdateSchema } from "@/lib/auth/schemas";
import {
  applySessionResult,
  authenticatedBackendFetch,
  clearSessionCookies,
  hasTrustedOrigin,
} from "@/lib/auth/server";

const passwordUpdateResponseSchema = z.object({
  reauthentication_required: z.literal(true),
  status: z.literal("updated"),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), {
      status: 403,
    });
  }

  const parsed = passwordUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(apiError("Check your password details"), {
      status: 422,
    });
  }

  try {
    const result = await authenticatedBackendFetch(
      request,
      "/api/v1/auth/password",
      {
        body: JSON.stringify({
          current_password: parsed.data.currentPassword || null,
          new_password: parsed.data.newPassword,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );

    if (!result.response.ok) {
      const message = await getBackendErrorMessage(
        result.response,
        "Your password could not be updated",
      );
      const response = NextResponse.json(apiError(message), {
        status: result.response.status,
      });
      applySessionResult(response, result);
      return response;
    }

    const responsePayload = passwordUpdateResponseSchema.safeParse(
      await result.response.clone().json().catch(() => null),
    );
    if (!responsePayload.success) {
      return NextResponse.json(apiError("Your password could not be updated"), {
        status: 502,
      });
    }

    const response = NextResponse.json(responsePayload.data);
    clearSessionCookies(response);
    return response;
  } catch {
    return NextResponse.json(apiError("Your password could not be updated"), {
      status: 502,
    });
  }
}
