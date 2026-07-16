import { LoanDetail } from "@/components/loans/loan-detail";
export default async function LoanDetailPage({ params }: { params: Promise<{ recordId: string }> }) { const { recordId } = await params; return <LoanDetail recordId={recordId} />; }
