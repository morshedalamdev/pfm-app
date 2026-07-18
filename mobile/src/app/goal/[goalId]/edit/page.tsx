import { GoalForm } from "@/components/plans/goal-form";

export default async function EditGoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  return <GoalForm goalId={goalId} />;
}
