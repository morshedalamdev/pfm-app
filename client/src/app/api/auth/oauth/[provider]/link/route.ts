import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBackendUrl } from "@/lib/api/config";
import { apiError, getBackendErrorMessage } from "@/lib/api/errors";
import {
  applySessionResult,
  authenticatedBackendFetch,
  hasTrustedOrigin,
} from "@/lib/auth/server";

type OAuthLinkContext = Readonly<{
  params: Promise<{ provider: string }>;
}>;

const linkIntentSchema = z.object({
  expires_at: z.string().min(1),
  link_intent: z.string().min(32).max(512),
  provider: z.enum(["google", "github"]),
});

export async function POST(
  request: NextRequest,
  context: OAuthLinkContext,
): Promise<NextResponse> {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(apiError("Request origin was rejected"), {
      status: 403,
    });
  }

  const { provider } = await context.params;
  if (provider !== "google" && provider !== "github") {
    return NextResponse.json(apiError("OAuth provider is not supported"), {
      status: 404,
    });
  }

  try {
    const result = await authenticatedBackendFetch(
      request,
      "/api/v1/auth/oauth/link-intents",
      {
        body: JSON.stringify({ provider }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    if (!result.response.ok) {
      const message = await getBackendErrorMessage(
        result.response,
        "This provider could not be connected right now",
      );
      const response = NextResponse.json(apiError(message), {
        status: result.response.status,
      });
      applySessionResult(response, result);
      return response;
    }

    const parsed = linkIntentSchema.safeParse(
      await result.response.clone().json().catch(() => null),
    );
    if (!parsed.success || parsed.data.provider !== provider) {
      const response = NextResponse.json(
        apiError("This provider could not be connected right now"),
        { status: 502 },
      );
      applySessionResult(response, result);
      return response;
    }

    const redirectUrl = new URL(
      getBackendUrl(`/api/v1/auth/oauth/${provider}/start`),
    );
    redirectUrl.searchParams.set("link_intent", parsed.data.link_intent);
    const response = NextResponse.json({ redirect_url: redirectUrl.toString() });
    applySessionResult(response, result);
    return response;
  } catch {
    return NextResponse.json(
      apiError("This provider could not be connected right now"),
      { status: 502 },
    );
  }
}
