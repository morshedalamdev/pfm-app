import { TransactionComposer } from "@/components/transactions/transaction-composer";
import type { TransactionKind } from "@/lib/transactions/types";

type NewTransactionPageProps = Readonly<{
  searchParams: Promise<{ type?: string }>;
}>;

export default async function NewTransactionPage({ searchParams }: NewTransactionPageProps) {
  const { type } = await searchParams;
  const initialKind: TransactionKind = type === "income" || type === "transfer" ? type : "expense";
  return <TransactionComposer initialKind={initialKind} />;
}
