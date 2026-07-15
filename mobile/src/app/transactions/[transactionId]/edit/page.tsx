import { EditTransaction } from "@/components/transactions/edit-transaction";

type EditTransactionPageProps = Readonly<{
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ receipt?: string }>;
}>;

export default async function EditTransactionPage({ params, searchParams }: EditTransactionPageProps) {
  const [{ transactionId }, { receipt }] = await Promise.all([params, searchParams]);
  return <EditTransaction receiptWarning={receipt === "failed"} transactionId={transactionId} />;
}
