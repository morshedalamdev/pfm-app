import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackendUrl } from "@/lib/api/config";
import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import type { OAuthRegistrationPreview } from "@/lib/api/types";
import { oauthRegistrationTicketSchema } from "@/lib/auth/schemas";
import { hasTrustedOrigin } from "@/lib/auth/server";

const previewSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  provider: z.enum(["google", "github"]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), {
      status: 403,
    });
  }

  const payload = await request.json().catch(() => null);
  const parsed = oauthRegistrationTicketSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(apiError("OAuth registration session is invalid"), {
      status: 422,
    });
  }

  try {
    const backendResponse = await fetch(
      getBackendUrl("/api/v1/auth/oauth/registration-preview"),
      {
        body: JSON.stringify({
          registration_ticket: parsed.data.registrationTicket,
        }),
        cache: "no-store",
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    if (!backendResponse.ok) {
      const message = await getBackendErrorMessage(
        backendResponse,
        "OAuth registration is temporarily unavailable",
      );
      return NextResponse.json(apiError(message), {
        status: backendResponse.status,
      });
    }

    const preview = previewSchema.safeParse(await backendResponse.json());
    if (!preview.success) {
      return NextResponse.json(apiError("OAuth profile could not be loaded"), {
        status: 502,
      });
    }
    return NextResponse.json<OAuthRegistrationPreview>(preview.data);
  } catch {
    return NextResponse.json(
      apiError("OAuth registration is temporarily unavailable"),
      { status: 502 },
    );
  }
}
