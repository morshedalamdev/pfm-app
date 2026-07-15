import { SettingsDashboard } from "@/components/settings/settings-dashboard";
import { settingsSection } from "@/lib/settings/utils";

type SettingsPageProps = Readonly<{
  searchParams: Promise<{ section?: string }>;
}>;

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  return <SettingsDashboard initialSection={settingsSection(params.section)} />;
}
