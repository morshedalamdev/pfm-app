import { LoanForm } from "@/components/loans/loan-form";
export default async function EditLoanPage({ params }: { params: Promise<{ recordId: string }> }) { const { recordId } = await params; return <LoanForm recordId={recordId} />; }
