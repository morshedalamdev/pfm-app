import { getSafeNextPath } from "@/lib/auth/safe-next-path";

export type OAuthProvider = "google" | "github";

const REGISTRATION_TICKET_KEY = "pfm.mobile.oauth_registration_ticket";
const NEXT_PATH_KEY = "pfm.mobile.oauth_next_path";

export function beginOAuth(provider: OAuthProvider, nextPath: string): void {
  window.sessionStorage.setItem(NEXT_PATH_KEY, getSafeNextPath(nextPath));
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

export function consumeOAuthNextPath(): string {
  const nextPath = getSafeNextPath(
    window.sessionStorage.getItem(NEXT_PATH_KEY),
  );
  window.sessionStorage.removeItem(NEXT_PATH_KEY);
  return nextPath;
}
