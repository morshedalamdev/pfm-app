import { SettingsHub } from "@/components/settings/settings-hub";
import { settingsSection } from "@/lib/settings/utils";
import type { Route } from "next";
import { redirect } from "next/navigation";

type SettingsPageProps = Readonly<{
  searchParams: Promise<{ section?: string }>;
}>;

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const section = settingsSection(params.section);
  const canonicalRoutes = {
    accounts: "/accounts",
    categories: "/settings/categories",
    loans: "/loan",
    notifications: "/notifications",
    profile: "/profile",
    recurring: "/transaction/recurring",
  } as const;

  if (section !== "overview") {
    redirect(canonicalRoutes[section] as Route);
  }

  return <SettingsHub />;
}
