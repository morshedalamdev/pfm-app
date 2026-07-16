"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Camera, FileText, Landmark, NotebookPen, Tags, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  deleteReceipt,
  getTransaction,
  listAccounts,
  listCategories,
  listReceipts,
  RECEIPT_ACCEPT,
  updateTransaction,
  uploadReceipt,
  validateReceipt,
} from "@/lib/transactions/api";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/transactions/schemas";
import type { Account, Category, Receipt, Transaction } from "@/lib/transactions/types";

function localDateTime(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function getEditData(transactionId: string) {
  const transaction = await getTransaction(transactionId);
  if (transaction.type !== "expense" && transaction.type !== "income") {
    throw new Error("Transfers cannot be edited after they are completed.");
  }
  const [accounts, categories, receipts] = await Promise.all([
    listAccounts(),
    listCategories(transaction.type),
    listReceipts(transactionId),
  ]);
  return {
    accounts: accounts.items.filter((account) => !account.is_archived),
    categories: categories.items.filter((category) => !category.is_archived),
    receipts: receipts.items,
    transaction,
  };
}

type EditFormProps = Readonly<{
  accounts: Account[];
  categories: Category[];
  receiptWarning: boolean;
  receipts: Receipt[];
  transaction: Transaction;
}>;

function EditForm({ accounts, categories, receiptWarning, receipts, transaction }: EditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLInputElement>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(receiptWarning ? "The transaction was saved, but its receipt did not upload. Try adding it again." : null);
  const [receiptToRemove, setReceiptToRemove] = useState<Receipt | null>(null);
  const {
    formState: { errors, isSubmitting, isDirty },
    handleSubmit,
    register,
    setError,
  } = useForm<TransactionFormValues>({
    defaultValues: {
      accountId: transaction.account_id,
      amount: transaction.amount,
      categoryId: transaction.category_id ?? "",
      convertedAmount: "",
      description: transaction.description ?? "",
      kind: transaction.type as "expense" | "income",
      toAccountId: "",
      transactionAt: localDateTime(transaction.transaction_at),
    },
    resolver: zodResolver(transactionFormSchema),
  });

  const save = handleSubmit(async (values) => {
    try {
      await updateTransaction(transaction.id, {
        account_id: values.accountId,
        amount: values.amount,
        category_id: values.categoryId,
        description: values.description || null,
        transaction_at: new Date(values.transactionAt).toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      router.replace("/transaction" as Route);
    } catch (error) {
      setError("root", { message: error instanceof Error ? error.message : "Unable to update this transaction" });
    }
  });

  async function addReceipt(file: File | undefined) {
    if (!file) return;
    const validationError = validateReceipt(file);
    if (validationError) {
      setReceiptError(validationError);
      return;
    }
    setReceiptBusy(true);
    setReceiptError(null);
    try {
      await uploadReceipt(transaction.id, file);
      await queryClient.invalidateQueries({ queryKey: ["transaction-edit", transaction.id] });
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : "Unable to upload the receipt");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function removeReceipt(receipt: Receipt) {
    setReceiptBusy(true);
    setReceiptError(null);
    try {
      await deleteReceipt(receipt.id);
      await queryClient.invalidateQueries({ queryKey: ["transaction-edit", transaction.id] });
      setReceiptToRemove(null);
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : "Unable to remove the receipt");
    } finally {
      setReceiptBusy(false);
    }
  }

  return (
    <>
      <div className={`edit-kind-badge edit-kind-badge--${transaction.type}`}>{transaction.type}</div>
      <form className="transaction-form transaction-form--edit" noValidate onSubmit={save}>
        <label className="transaction-field amount-field">
          <span>Amount</span>
          <span className="amount-input"><small>{transaction.currency}</small><input aria-label="Amount" inputMode="decimal" {...register("amount")} /></span>
          {errors.amount ? <small role="alert">{errors.amount.message}</small> : null}
        </label>
        <div className="form-card">
          <label className="transaction-field"><span><Landmark aria-hidden="true" size={17} />Account</span><select aria-label="Account" {...register("accountId")}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select>{errors.accountId ? <small role="alert">{errors.accountId.message}</small> : null}</label>
          <label className="transaction-field"><span><Tags aria-hidden="true" size={17} />Category</span><select aria-label="Category" {...register("categoryId")}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.categoryId ? <small role="alert">{errors.categoryId.message}</small> : null}</label>
          <label className="transaction-field"><span><CalendarDays aria-hidden="true" size={17} />Date and time</span><input aria-label="Date and time" type="datetime-local" {...register("transactionAt")} />{errors.transactionAt ? <small role="alert">{errors.transactionAt.message}</small> : null}</label>
          <label className="transaction-field"><span><NotebookPen aria-hidden="true" size={17} />Note</span><textarea aria-label="Note" maxLength={500} rows={3} {...register("description")} />{errors.description ? <small role="alert">{errors.description.message}</small> : null}</label>
        </div>
        {errors.root ? <p className="form-error" role="alert">{errors.root.message}</p> : null}
        <button className="save-transaction-button" disabled={isSubmitting || !isDirty} type="submit">{isSubmitting ? "Saving…" : "Save changes"}</button>
      </form>

      <section aria-labelledby="receipts-heading" className="receipt-manager">
        <div className="section-heading"><div><p className="eyebrow">ATTACHMENTS</p><h2 id="receipts-heading">Receipts</h2></div><button disabled={receiptBusy} onClick={() => receiptRef.current?.click()} type="button"><Camera aria-hidden="true" size={16} /> Add</button></div>
        <input accept={RECEIPT_ACCEPT} aria-label="Add receipt file" className="sr-only" onChange={(event) => void addReceipt(event.target.files?.[0])} ref={receiptRef} type="file" />
        {receiptError ? <p className="form-error" role="alert">{receiptError}</p> : null}
        {receipts.length ? <div className="receipt-list">{receipts.map((receipt) => <div className="receipt-item" key={receipt.id}><FileText aria-hidden="true" size={19} /><div><strong>{receipt.original_filename}</strong><span>{Math.max(1, Math.round(receipt.size_bytes / 1024))} KB</span></div><button aria-label={`Remove ${receipt.original_filename}`} disabled={receiptBusy} onClick={() => setReceiptToRemove(receipt)} type="button"><Trash2 aria-hidden="true" size={17} /></button></div>)}</div> : <p className="receipt-empty">No receipts attached yet.</p>}
      </section>
      <Drawer onOpenChange={(open) => { if (!open) setReceiptToRemove(null); }} open={Boolean(receiptToRemove)}><DrawerContent><DrawerHeader><DrawerTitle>Remove this receipt?</DrawerTitle><DrawerDescription>{receiptToRemove ? `${receiptToRemove.original_filename} will be permanently removed from this transaction.` : "This receipt will be removed."}</DrawerDescription></DrawerHeader><DrawerFooter><button className="drawer-danger-button" disabled={receiptBusy || !receiptToRemove} onClick={() => { if (receiptToRemove) void removeReceipt(receiptToRemove); }} type="button">{receiptBusy ? "Removing…" : "Remove receipt"}</button><DrawerClose asChild><button className="drawer-close-button" type="button">Keep receipt</button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
    </>
  );
}

export function EditTransaction({ receiptWarning, transactionId }: { receiptWarning: boolean; transactionId: string }) {
  const edit = useQuery({ queryFn: () => getEditData(transactionId), queryKey: ["transaction-edit", transactionId] });

  return (
    <MobileShell>
      <div className="standard-page transaction-page">
        <PageHeader backHref={"/transaction" as Route} title="Edit transaction" />
        {edit.isPending ? <div aria-busy="true" className="transaction-form-skeleton" /> : null}
        {edit.isError ? <div className="form-load-error" role="alert"><strong>{edit.error.message}</strong><button onClick={() => void edit.refetch()} type="button">Try again</button></div> : null}
        {edit.data ? <EditForm accounts={edit.data.accounts} categories={edit.data.categories} receiptWarning={receiptWarning} receipts={edit.data.receipts} transaction={edit.data.transaction} /> : null}
      </div>
    </MobileShell>
  );
}
