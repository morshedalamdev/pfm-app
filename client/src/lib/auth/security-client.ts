import { getBackendErrorMessage } from "@/lib/api/errors";
import type {
  PasswordUpdateResponse,
  SignInMethods,
} from "@/lib/api/types";
import { getBackendJson } from "@/lib/api/client";
import type { OAuthProvider } from "@/lib/auth/oauth-client";

export function getSignInMethods(): Promise<SignInMethods> {
  return getBackendJson<SignInMethods>(
    "auth/methods",
    "We couldn't load your sign-in methods.",
  );
}

export async function beginOAuthLink(provider: OAuthProvider): Promise<void> {
  const response = await fetch(`/api/auth/oauth/${provider}/link`, {
    headers: { accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      await getBackendErrorMessage(
        response,
        `We couldn't connect ${provider} right now.`,
      ),
    );
  }

  const payload = (await response.json()) as { redirect_url?: unknown };
  if (typeof payload.redirect_url !== "string") {
    throw new Error(`We couldn't connect ${provider} right now.`);
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
    throw new Error(
      await getBackendErrorMessage(response, "Your password could not be updated."),
    );
  }
  return (await response.json()) as PasswordUpdateResponse;
}
