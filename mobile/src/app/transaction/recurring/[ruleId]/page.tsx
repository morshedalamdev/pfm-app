import { RecurringDetail } from "@/components/recurring/recurring-detail";

export default async function RecurringDetailPage({ params }: { params: Promise<{ ruleId: string }> }) {
  const { ruleId } = await params;
  return <RecurringDetail ruleId={ruleId} />;
}
