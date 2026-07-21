import { SecurityDashboard } from "@/components/settings/security-dashboard";

type SecurityPageProps = Readonly<{
  searchParams: Promise<{ oauth_link?: string; provider?: string }>;
}>;

export default async function SecurityPage({ searchParams }: SecurityPageProps) {
  const params = await searchParams;
  return <SecurityDashboard oauthLink={params.oauth_link} provider={params.provider} />;
}
