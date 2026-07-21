"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Chrome, Github, KeyRound, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import { type FormEvent, useEffect, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { BackendRequestError } from "@/lib/api/client";
import type { OAuthProvider } from "@/lib/auth/oauth-client";
import {
  beginOAuthLink,
  getSignInMethods,
  updatePassword,
} from "@/lib/auth/security-client";
import { passwordUpdateSchema } from "@/lib/auth/schemas";
import { useAuthStore } from "@/lib/auth/store";

type OAuthLinkResult =
  | "already_linked"
  | "callback_failed"
  | "connected"
  | "provider_in_use";

type SecurityDashboardProps = Readonly<{
  oauthLink?: string;
  provider?: string;
}>;

const providers = [
  { label: "Google", provider: "google" },
  { label: "GitHub", provider: "github" },
] as const;

function requiresAuthentication(cause: unknown): boolean {
  return cause instanceof BackendRequestError && cause.status === 401;
}

function returnToAuthentication(clearSession: () => void): void {
  clearSession();
  window.location.assign("/auth?next=%2Fsettings%2Fsecurity");
}

function linkNotice(
  provider: string | undefined,
  result: string | undefined,
  connectedProviders: readonly OAuthProvider[] | undefined,
) {
  if (provider !== "google" && provider !== "github") return null;
  if (result === "connected" && !connectedProviders?.includes(provider)) return null;
  const label = provider === "github" ? "GitHub" : "Google";
  const messages: Partial<Record<OAuthLinkResult, string>> = {
    already_linked: `${label} is already connected to this account with a different identity.`,
    callback_failed: `${label} could not be connected. Please try again.`,
    connected: `${label} is now connected to this account.`,
    provider_in_use: `That ${label} identity is already connected to another PFM account.`,
  };
  const message = messages[result as OAuthLinkResult];
  return message ? { message, success: result === "connected" } : null;
}

function ProviderRow({
  connected,
  label,
  provider,
}: {
  connected: boolean;
  label: string;
  provider: OAuthProvider;
}) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const [error, setError] = useState<string | null>(null);
  const connect = useMutation({ mutationFn: () => beginOAuthLink(provider) });
  const Icon = provider === "github" ? Github : Chrome;

  async function handleConnect() {
    setError(null);
    try {
      await connect.mutateAsync();
    } catch (cause) {
      if (requiresAuthentication(cause)) {
        returnToAuthentication(clearSession);
        return;
      }
      setError(cause instanceof Error ? cause.message : `We couldn't connect ${label}.`);
    }
  }

  return (
    <div className="security-method-row">
      <span className="security-method-icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="security-method-copy">
        <strong>{label}</strong>
        <small>{connected ? "Connected to this account" : "Not connected"}</small>
        {error ? <small className="security-inline-error" role="alert">{error}</small> : null}
      </span>
      {connected ? (
        <span className="status-pill">Connected</span>
      ) : (
        <button aria-label={`Connect ${label}`} disabled={connect.isPending} onClick={() => void handleConnect()} type="button">
          {connect.isPending ? "Connecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}

function PasswordForm({ passwordEnabled }: { passwordEnabled: boolean }) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const email = useAuthStore((state) => state.user?.email);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: updatePassword });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const parsed = passwordUpdateSchema.safeParse({
      currentPassword: passwordEnabled ? currentPassword : undefined,
      newPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your password details.");
      return;
    }
    if (passwordEnabled && !currentPassword) {
      setError("Enter your current password.");
      return;
    }

    try {
      await save.mutateAsync(parsed.data);
      clearSession();
      const query = new URLSearchParams({ password_updated: "1" });
      if (email) query.set("email", email);
      window.location.assign(`/auth/login?${query.toString()}`);
    } catch (cause) {
      if (requiresAuthentication(cause)) {
        returnToAuthentication(clearSession);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Your password could not be updated.");
    }
  }

  return (
    <form className="security-password-form" noValidate onSubmit={(event) => void submit(event)}>
      <div className="settings-hub-heading">
        <p className="eyebrow">PASSWORD</p>
        <h2>{passwordEnabled ? "Change your password" : "Add email and password sign-in"}</h2>
        <p>{passwordEnabled ? "After saving, sign in again. Other devices lose access as their current sessions expire." : "Use your account email and this password as another way to sign in. Saving ends current refresh sessions."}</p>
      </div>
      <div className="form-card">
        {passwordEnabled ? <label className="transaction-field"><span>Current password</span><input autoComplete="current-password" name="currentPassword" type="password" /></label> : null}
        <label className="transaction-field"><span>New password</span><input aria-describedby="security-password-requirements" autoComplete="new-password" name="newPassword" type="password" /></label>
        <label className="transaction-field"><span>Confirm new password</span><input aria-describedby="security-password-requirements" autoComplete="new-password" name="confirmPassword" type="password" /></label>
        <p className="security-password-help" id="security-password-requirements">Use 12–128 characters with uppercase, lowercase, and a number.</p>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="save-transaction-button" disabled={save.isPending} type="submit">{save.isPending ? "Updating…" : passwordEnabled ? "Change password" : "Set password"}</button>
    </form>
  );
}

export function SecurityDashboard({ oauthLink, provider }: SecurityDashboardProps) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const methods = useQuery({ queryFn: getSignInMethods, queryKey: ["auth", "methods"] });
  const notice = linkNotice(provider, oauthLink, methods.data?.connected_providers);

  useEffect(() => {
    if (oauthLink || provider) {
      window.history.replaceState(null, "", "/settings/security");
    }
  }, [oauthLink, provider]);

  useEffect(() => {
    if (requiresAuthentication(methods.error)) {
      returnToAuthentication(clearSession);
    }
  }, [clearSession, methods.error]);

  return (
    <MobileShell><div className="standard-page security-page"><PageHeader backHref={"/settings" as Route} title="Sign-in & security" />
      <section className="security-hero"><span aria-hidden="true"><ShieldCheck size={28} /></span><div><p className="eyebrow">ONE ACCOUNT</p><h2>Choose every way you sign in.</h2><p>Google, GitHub, and your email password can all open this same PFM account.</p></div></section>
      {notice ? <p className={notice.success ? "form-notice" : "form-error"} role={notice.success ? "status" : "alert"}>{notice.message}</p> : null}
      {methods.isPending ? <div aria-busy="true" aria-label="Loading sign-in methods" className="security-skeleton" /> : null}
      {methods.isError ? <section className="management-error" role="alert"><strong>Couldn’t load sign-in methods</strong><p>{methods.error.message}</p><button onClick={() => void methods.refetch()} type="button">Try again</button></section> : null}
      {methods.data ? <>
        <section className="security-methods-card" aria-labelledby="connected-accounts-heading"><div className="settings-hub-heading"><p className="eyebrow">CONNECTED ACCOUNTS</p><h2 id="connected-accounts-heading">Provider sign-in</h2><p>Connect only identities you control. Each provider stays tied to this account.</p></div>{providers.map(({ label, provider: methodProvider }) => <ProviderRow connected={methods.data.connected_providers.includes(methodProvider)} key={methodProvider} label={label} provider={methodProvider} />)}<div className="security-method-row"><span className="security-method-icon" aria-hidden="true"><KeyRound size={20} /></span><span className="security-method-copy"><strong>Email and password</strong><small>{methods.data.password_enabled ? "Enabled for this account" : "Not set"}</small></span><span className={methods.data.password_enabled ? "status-pill" : "status-pill status-pill--muted"}>{methods.data.password_enabled ? "Enabled" : "Not set"}</span></div></section>
        <PasswordForm passwordEnabled={methods.data.password_enabled} />
      </> : null}
    </div></MobileShell>
  );
}
