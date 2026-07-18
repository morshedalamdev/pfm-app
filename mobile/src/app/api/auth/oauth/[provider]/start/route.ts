import { NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/api/config";

type OAuthStartContext = Readonly<{
  params: Promise<{ provider: string }>;
}>;

export async function GET(
  _request: Request,
  context: OAuthStartContext,
): Promise<NextResponse> {
  const { provider } = await context.params;
  if (provider !== "google" && provider !== "github") {
    return NextResponse.json(
      { error: { message: "OAuth provider is not supported" } },
      { status: 404 },
    );
  }

  return NextResponse.redirect(
    getBackendUrl(`/api/v1/auth/oauth/${provider}/start`),
  );
}
