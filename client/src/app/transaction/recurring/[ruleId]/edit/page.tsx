import { RecurringForm } from "@/components/recurring/recurring-form";

export default async function EditRecurringPage({ params }: { params: Promise<{ ruleId: string }> }) {
  const { ruleId } = await params;
  return <RecurringForm ruleId={ruleId} />;
}
