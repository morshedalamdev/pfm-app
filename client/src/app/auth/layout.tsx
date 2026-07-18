import type { ReactNode } from "react";

import { AuthBrand } from "@/components/auth/auth-brand";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-shell">
      <div className="auth-gradient">
        <AuthBrand />
        <div className="auth-gradient-copy">
          <p>Money, made clear.</p>
          <span>One calm place for every financial decision.</span>
        </div>
      </div>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
