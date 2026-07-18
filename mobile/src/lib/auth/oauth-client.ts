export type OAuthProvider = "google" | "github";

const REGISTRATION_TICKET_KEY = "pfm.mobile.oauth_registration_ticket";

export function beginOAuth(provider: OAuthProvider): void {
  window.location.assign(`/api/auth/oauth/${provider}/start`);
}

export function storeOAuthRegistrationTicket(ticket: string): void {
  window.sessionStorage.setItem(REGISTRATION_TICKET_KEY, ticket);
}

export function getOAuthRegistrationTicket(): string | null {
  return window.sessionStorage.getItem(REGISTRATION_TICKET_KEY);
}

export function clearOAuthRegistrationTicket(): void {
  window.sessionStorage.removeItem(REGISTRATION_TICKET_KEY);
}
