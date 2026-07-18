import { getApiBaseUrl, apiPost } from "@/lib/api/client";
import type { components } from "@/generated/api-types";

export type OAuthProvider = "google" | "github";
type OAuthRegistrationPreview =
  components["schemas"]["OAuthRegistrationPreviewResponse"];
type OAuthRegistrationTicketRequest =
  components["schemas"]["OAuthRegistrationTicketRequest"];

const OAUTH_REGISTRATION_TICKET_KEY = "pfm.auth.oauth_registration_ticket";

export function beginOAuthSignIn(provider: OAuthProvider): void {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("Authentication service is unavailable.");
  }

  window.location.assign(
    `${apiBaseUrl}/api/v1/auth/oauth/${encodeURIComponent(provider)}/start`,
  );
}

export async function previewOAuthRegistration(
  registrationTicket: string,
): Promise<OAuthRegistrationPreview> {
  return apiPost<OAuthRegistrationTicketRequest, OAuthRegistrationPreview>(
    "/api/v1/auth/oauth/registration-preview",
    { registration_ticket: registrationTicket },
  );
}

export function storeOAuthRegistrationTicket(ticket: string): void {
  window.sessionStorage.setItem(OAUTH_REGISTRATION_TICKET_KEY, ticket);
}

export function getOAuthRegistrationTicket(): string | null {
  return window.sessionStorage.getItem(OAUTH_REGISTRATION_TICKET_KEY);
}

export function clearOAuthRegistrationTicket(): void {
  window.sessionStorage.removeItem(OAUTH_REGISTRATION_TICKET_KEY);
}
