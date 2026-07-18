import { GoalDetail } from "@/components/plans/goal-detail";

export default async function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  return <GoalDetail goalId={goalId} />;
}
