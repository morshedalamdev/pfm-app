import type { components } from "@generated/api-types";

export type AccessTokenResponse = components["schemas"]["AccessTokenResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type OAuthRegistrationPreview =
  components["schemas"]["OAuthRegistrationPreviewResponse"];
export type OAuthLinkIntent = components["schemas"]["OAuthLinkIntentResponse"];
export type PasswordUpdate = components["schemas"]["PasswordUpdateRequest"];
export type PasswordUpdateResponse =
  components["schemas"]["PasswordUpdateResponse"];
export type RegisterUserRequest = components["schemas"]["RegisterUserRequest"];
export type RegisteredUser = components["schemas"]["RegisteredUserResponse"];
export type SignInMethods = components["schemas"]["SignInMethodsResponse"];
export type User = components["schemas"]["UserResponse"];

export type AuthResponse = Readonly<{
  user: User;
}>;

export type SessionResponse = Readonly<{
  user: User | null;
}>;

export type EmailAuthRouteResponse = Readonly<{
  destination: "login" | "register";
}>;
