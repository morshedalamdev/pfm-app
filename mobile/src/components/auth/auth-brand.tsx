import { ShieldCheck, Sparkles } from "lucide-react";

export function AuthBrand() {
  return (
    <div className="auth-brand">
      <span className="auth-logo" aria-hidden="true">
        <Sparkles size={25} strokeWidth={2.2} />
      </span>
      <div>
        <strong>PFM</strong>
        <span><ShieldCheck aria-hidden="true" size={13} /> Private by design</span>
      </div>
    </div>
  );
}
