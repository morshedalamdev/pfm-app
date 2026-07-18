import { PersonForm } from "@/components/loans/person-form";
export default async function NewLoanPersonPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; return <PersonForm next={next} />; }
