import { PersonForm } from "@/components/loans/person-form";
export default async function EditLoanPersonPage({ params }: { params: Promise<{ personId: string }> }) { const { personId } = await params; return <PersonForm personId={personId} />; }
