import { TransactionDetail } from "@/components/transactions/transaction-detail";

type TransactionDetailPageProps = Readonly<{
  params: Promise<{ transactionId: string }>;
}>;

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { transactionId } = await params;
  return <TransactionDetail transactionId={transactionId} />;
}
