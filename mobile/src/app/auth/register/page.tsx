import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <>
      <div className="auth-panel-heading">
        <p className="eyebrow">START FRESH</p>
        <h1>Create your account</h1>
        <p>Your first step toward a clearer financial picture.</p>
      </div>
      <RegisterForm />
    </>
  );
}
