"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, FileText, Landmark, Pencil, Tags, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { deleteTransaction, getTransactionDetail } from "@/lib/transactions/api";
import { isIncomingTransaction, isTransferTransaction, transactionTitle } from "@/lib/transactions/history";
import { formatMoney } from "@/lib/home/view-model";

function detailDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export function TransactionDetail({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const detail = useQuery({ queryFn: () => getTransactionDetail(transactionId), queryKey: ["transaction-detail", transactionId] });
  const remove = useMutation({ mutationFn: deleteTransaction });
  const data = detail.data;

  async function confirmDelete() {
    setDeleteError(null);
    try {
      await remove.mutateAsync(transactionId);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["home"] }), queryClient.invalidateQueries({ queryKey: ["transactions"] })]);
      router.replace("/transaction" as Route);
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Unable to delete this transaction."); }
  }

  const transaction = data?.transaction;
  const incoming = transaction ? isIncomingTransaction(transaction) : false;
  const transfer = transaction ? isTransferTransaction(transaction) : false;
  const account = transaction ? data?.accounts.find((item) => item.id === transaction.account_id) : undefined;
  const category = transaction ? data?.categories.find((item) => item.id === transaction.category_id) : undefined;
  const Icon = transfer ? ArrowLeftRight : incoming ? ArrowDownLeft : ArrowUpRight;

  return <MobileShell><div className="standard-page transaction-detail-page"><PageHeader backHref={"/transaction" as Route} title="Transaction details" />
    {detail.isPending ? <div aria-busy="true" aria-label="Loading transaction" className="transaction-form-skeleton" /> : null}
    {detail.isError ? <section className="transaction-history-error" role="alert"><strong>Couldn’t load this transaction</strong><p>{detail.error.message}</p><button onClick={() => void detail.refetch()} type="button">Try again</button></section> : null}
    {data && transaction ? <><section className={`transaction-detail-hero ${incoming ? "transaction-detail-hero--incoming" : transfer ? "transaction-detail-hero--transfer" : ""}`}><span><Icon aria-hidden="true" size={25} /></span><p>{transaction.type.replaceAll("_", " ")}</p><h2>{transactionTitle(transaction, data.categories)}</h2><strong>{incoming ? "+" : "−"}{formatMoney(transaction.amount, transaction.currency)}</strong></section>
      <section className="transaction-detail-facts"><div><CalendarDays aria-hidden="true" size={17} /><span>Date</span><strong>{detailDate(transaction.transaction_at)}</strong></div><div><Landmark aria-hidden="true" size={17} /><span>Account</span><strong>{account?.name ?? "Account"}</strong></div>{!transfer ? <div><Tags aria-hidden="true" size={17} /><span>Category</span><strong>{category?.name ?? "Uncategorized"}</strong></div> : null}<div><FileText aria-hidden="true" size={17} /><span>Receipts</span><strong>{data.receipts.length}</strong></div></section>
      {transaction.description ? <section className="transaction-detail-note"><p className="eyebrow">NOTE</p><p>{transaction.description}</p></section> : null}
      {data.receipts.length ? <section className="transaction-detail-receipts"><p className="eyebrow">RECEIPTS</p>{data.receipts.map((receipt) => <div key={receipt.id}><FileText aria-hidden="true" size={17} /><span>{receipt.original_filename}</span><small>{Math.max(1, Math.round(receipt.size_bytes / 1024))} KB</small></div>)}</section> : null}
      <section className="transaction-detail-actions">{!transfer ? <Link href={`/transaction/${transaction.id}/edit` as Route}><Pencil aria-hidden="true" size={17} />Edit transaction</Link> : <p>Completed transfers can’t be edited.</p>}<button onClick={() => setDeleteOpen(true)} type="button"><Trash2 aria-hidden="true" size={17} />Delete transaction</button></section>
    </> : null}
    <Drawer onOpenChange={setDeleteOpen} open={deleteOpen}><DrawerContent><DrawerHeader><DrawerTitle>Delete this transaction?</DrawerTitle><DrawerDescription>This removes it from your activity and restores the affected balance. This can’t be undone.</DrawerDescription></DrawerHeader>{deleteError ? <p className="drawer-error" role="alert">{deleteError}</p> : null}<DrawerFooter><button className="drawer-danger-button" disabled={remove.isPending} onClick={() => void confirmDelete()} type="button">{remove.isPending ? "Deleting…" : "Delete transaction"}</button><DrawerClose asChild><button className="drawer-close-button" type="button">Keep transaction</button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
