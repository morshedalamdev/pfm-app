import { getBackendErrorMessage } from "@/lib/api/errors";
import type {
  PasswordUpdateResponse,
  SignInMethods,
} from "@/lib/api/types";
import { BackendRequestError, getBackendJson } from "@/lib/api/client";
import type { OAuthProvider } from "@/lib/auth/oauth-client";
import { z } from "zod";

const signInMethodsSchema = z.object({
  connected_providers: z.array(z.enum(["google", "github"])),
  password_enabled: z.boolean(),
});

export async function getSignInMethods(): Promise<SignInMethods> {
  const payload = await getBackendJson<unknown>(
    "auth/methods",
    "We couldn't load your sign-in methods.",
  );
  const parsed = signInMethodsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BackendRequestError("We couldn't load your sign-in methods.", 502);
  }
  return parsed.data;
}

export async function beginOAuthLink(provider: OAuthProvider): Promise<void> {
  const response = await fetch(`/api/auth/oauth/${provider}/link`, {
    headers: { accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new BackendRequestError(
      await getBackendErrorMessage(
        response,
        `We couldn't connect ${provider} right now.`,
      ),
      response.status,
    );
  }

  const payload = (await response.json()) as { redirect_url?: unknown };
  if (typeof payload.redirect_url !== "string") {
    throw new BackendRequestError(`We couldn't connect ${provider} right now.`, 502);
  }
  window.location.assign(payload.redirect_url);
}

export async function updatePassword(payload: {
  currentPassword?: string;
  newPassword: string;
}): Promise<PasswordUpdateResponse> {
  const response = await fetch("/api/auth/password", {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
  if (!response.ok) {
    throw new BackendRequestError(
      await getBackendErrorMessage(response, "Your password could not be updated."),
      response.status,
    );
  }
  return (await response.json()) as PasswordUpdateResponse;
}
