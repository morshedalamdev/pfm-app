import { AuthOptions } from "@/components/auth/auth-options";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

type AuthPageProps = Readonly<{
  searchParams: Promise<{ email?: string; next?: string; reason?: string }>;
}>;

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;

  return (
    <>
      <div className="auth-panel-heading">
        <p className="eyebrow">WELCOME</p>
        <h1>Log in or sign up</h1>
        <p>Choose how you want to continue to your private finance overview.</p>
      </div>
      <AuthOptions
        defaultEmail={params.email}
        nextPath={getSafeNextPath(params.next)}
        serviceUnavailable={params.reason === "unavailable"}
      />
    </>
  );
}
