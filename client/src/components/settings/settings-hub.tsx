"use client";

import { Bell, CalendarClock, ChevronRight, CircleUserRound, Landmark, ShieldCheck, Tags, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const setupLinks = [
  { description: "Names, contact details, and currency", href: "/profile", icon: CircleUserRound, label: "Profile" },
  { description: "Password and connected sign-in providers", href: "/settings/security", icon: ShieldCheck, label: "Sign-in & security" },
  { description: "Accounts, cards, cash, and defaults", href: "/accounts", icon: Landmark, label: "Accounts" },
  { description: "Labels used for income and spending", href: "/settings/categories", icon: Tags, label: "Categories" },
] as const;

const activityLinks = [
  { description: "Budget and account updates", href: "/notifications", icon: Bell, label: "Notifications" },
  { description: "Payments and income that repeat", href: "/transaction/recurring", icon: CalendarClock, label: "Recurring transactions" },
] as const;

function SettingsLinks({ items }: { items: ReadonlyArray<{ description: string; href: string; icon: LucideIcon; label: string }> }) {
  return <div className="settings-hub-links">{items.map(({ description, href, icon: Icon, label }) => <Link href={href as Route} key={href}><span className="category-icon accent-purple"><Icon aria-hidden="true" size={19} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight aria-hidden="true" size={18} /></Link>)}</div>;
}

export function SettingsHub() {
  return <MobileShell><div className="standard-page settings-hub-page"><PageHeader backHref={null} title="Settings" /><section className="settings-hub-hero"><p className="eyebrow">YOUR SPACE</p><h2>Make the app feel like yours.</h2><p>Personal details and everyday money setup live here. Each task has its own clear path.</p></section><section className="settings-hub-section" aria-labelledby="account-setup-heading"><div className="settings-hub-heading"><p className="eyebrow">ACCOUNT SETUP</p><h2 id="account-setup-heading">Personal and money details</h2></div><SettingsLinks items={setupLinks} /></section><section className="settings-hub-section" aria-labelledby="activity-heading"><div className="settings-hub-heading"><p className="eyebrow">ACTIVITY</p><h2 id="activity-heading">Updates and automations</h2></div><SettingsLinks items={activityLinks} /></section><section className="settings-hub-section"><div className="settings-hub-heading"><p className="eyebrow">APPEARANCE</p><h2>Choose your theme</h2><p>Use light, dark, or match this device.</p></div><ThemeToggle /></section><LogoutButton /></div></MobileShell>;
}
