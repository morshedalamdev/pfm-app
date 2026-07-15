import { Bell, ChevronRight, CircleUserRound, Landmark, Tags } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const settings = [
  { icon: CircleUserRound, label: "Profile" },
  { icon: Landmark, label: "Accounts" },
  { icon: Tags, label: "Categories" },
  { icon: Bell, label: "Notifications" },
];

export default function SettingsPage() {
  return (
    <MobileShell>
      <div className="standard-page">
        <PageHeader title="Settings" />
        <section aria-labelledby="appearance-heading" className="settings-section">
          <p className="eyebrow">APPEARANCE</p>
          <h2 id="appearance-heading">Choose your theme</h2>
          <p className="settings-description">Use a light, dark, or device-matched experience.</p>
          <ThemeToggle />
        </section>
        <section aria-label="Account settings" className="settings-list">
          {settings.map(({ icon: Icon, label }) => (
            <button key={label} type="button">
              <span className="category-icon accent-purple"><Icon aria-hidden="true" size={19} /></span>
              <strong>{label}</strong>
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          ))}
        </section>
        <LogoutButton />
      </div>
    </MobileShell>
  );
}
