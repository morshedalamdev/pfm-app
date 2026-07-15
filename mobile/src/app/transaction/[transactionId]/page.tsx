import type { Route } from "next";
import { redirect } from "next/navigation";

type TransactionDetailPageProps = Readonly<{
  params: Promise<{ transactionId: string }>;
}>;

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { transactionId } = await params;
  redirect(`/transaction/${encodeURIComponent(transactionId)}/edit` as Route);
}
