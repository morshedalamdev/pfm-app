import { OAuthRegisterForm } from "@/components/auth/oauth-register-form";
import { RegisterForm } from "@/components/auth/register-form";

type RegisterPageProps = Readonly<{
  searchParams: Promise<{ email?: string; oauth?: string }>;
}>;

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const isOAuth = params.oauth === "1";

  return (
    <>
      <div className="auth-panel-heading">
        <p className="eyebrow">START FRESH</p>
        <h1>Create your account</h1>
        <p>{isOAuth ? "Review your provider details before creating your account." : "Your first step toward a clearer financial picture."}</p>
      </div>
      {isOAuth ? <OAuthRegisterForm /> : <RegisterForm defaultEmail={params.email} />}
    </>
  );
}
