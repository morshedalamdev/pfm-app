"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CalendarDays, Camera, Landmark, NotebookPen, Tags } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  createTransaction,
  createTransfer,
  getComposerOptions,
  RECEIPT_ACCEPT,
  uploadReceipt,
  validateReceipt,
} from "@/lib/transactions/api";
import { transactionFormSchema, type TransactionFormValues, validateConvertedAmount } from "@/lib/transactions/schemas";
import type { Account, Category, TransactionKind } from "@/lib/transactions/types";

function currentLocalDateTime(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type ComposerFormProps = Readonly<{
  accounts: Account[];
  categories: Category[];
  kind: TransactionKind;
}>;

function ComposerForm({ accounts, categories, kind }: ComposerFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<TransactionFormValues>({
    defaultValues: {
      accountId: accounts.find((account) => account.is_default)?.id ?? accounts[0]?.id ?? "",
      amount: "",
      categoryId: categories[0]?.id ?? "",
      convertedAmount: "",
      description: "",
      kind,
      toAccountId: accounts.find((account) => !account.is_default)?.id ?? accounts[1]?.id ?? "",
      transactionAt: currentLocalDateTime(),
    },
    resolver: zodResolver(transactionFormSchema),
  });
  const fromAccountId = useWatch({ control, name: "accountId" });
  const toAccountId = useWatch({ control, name: "toAccountId" });
  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const toAccount = accounts.find((account) => account.id === toAccountId);
  const currenciesDiffer = kind === "transfer" && fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const onSubmit = handleSubmit(async (values) => {
    if (receipt) {
      const fileError = validateReceipt(receipt);
      if (fileError) {
        setError("root", { message: fileError });
        return;
      }
    }
    if (currenciesDiffer) {
      const convertedError = validateConvertedAmount(values.convertedAmount);
      if (convertedError) {
        setError("convertedAmount", { message: convertedError });
        return;
      }
    }

    try {
      const transactionAt = new Date(values.transactionAt).toISOString();
      let receiptTransactionId: string;
      if (kind === "transfer") {
        const transfer = await createTransfer({
          amount: values.amount,
          converted_amount: currenciesDiffer ? values.convertedAmount : null,
          description: values.description || null,
          from_account_id: values.accountId,
          to_account_id: values.toAccountId,
          transaction_at: transactionAt,
        }, crypto.randomUUID());
        receiptTransactionId = transfer.debit_transaction_id;
      } else {
        const transaction = await createTransaction({
          account_id: values.accountId,
          amount: values.amount,
          category_id: values.categoryId,
          description: values.description || null,
          transaction_at: transactionAt,
          type: kind,
        }, crypto.randomUUID());
        receiptTransactionId = transaction.id;
      }

      await queryClient.invalidateQueries({ queryKey: ["home"] });
      if (receipt) {
        try {
          await uploadReceipt(receiptTransactionId, receipt);
        } catch {
          router.replace(`/transactions/${receiptTransactionId}/edit?receipt=failed` as Route);
          return;
        }
      }
      router.replace("/");
    } catch (error) {
      setError("root", { message: error instanceof Error ? error.message : "Unable to save this transaction" });
    }
  });

  const missingSetup = accounts.length < (kind === "transfer" ? 2 : 1) || (kind !== "transfer" && categories.length === 0);

  return (
    <form className="transaction-form" noValidate onSubmit={onSubmit}>
      {missingSetup ? <p className="form-notice" role="status">Add {accounts.length < (kind === "transfer" ? 2 : 1) ? "the required accounts" : `an ${kind} category`} in Settings before saving.</p> : null}

      <label className="transaction-field amount-field">
        <span>Amount</span>
        <span className="amount-input"><small>{fromAccount?.currency ?? "USD"}</small><input aria-label="Amount" inputMode="decimal" placeholder="0.00" {...register("amount")} /></span>
        {errors.amount ? <small role="alert">{errors.amount.message}</small> : null}
      </label>

      <div className="form-card">
        <label className="transaction-field">
          <span><Landmark aria-hidden="true" size={17} />{kind === "transfer" ? "From account" : "Account"}</span>
          <select aria-label={kind === "transfer" ? "From account" : "Account"} {...register("accountId")}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
          </select>
          {errors.accountId ? <small role="alert">{errors.accountId.message}</small> : null}
        </label>

        {kind === "transfer" ? (
          <label className="transaction-field">
            <span><ArrowRightLeft aria-hidden="true" size={17} />To account</span>
            <select aria-label="To account" {...register("toAccountId")}>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
            </select>
            {errors.toAccountId ? <small role="alert">{errors.toAccountId.message}</small> : null}
          </label>
        ) : (
          <label className="transaction-field">
            <span><Tags aria-hidden="true" size={17} />Category</span>
            <select aria-label="Category" {...register("categoryId")}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {errors.categoryId ? <small role="alert">{errors.categoryId.message}</small> : null}
          </label>
        )}

        {currenciesDiffer ? (
          <label className="transaction-field">
            <span><ArrowRightLeft aria-hidden="true" size={17} />Amount received · {toAccount?.currency}</span>
            <input aria-label={`Amount received in ${toAccount?.currency}`} inputMode="decimal" placeholder="0.00" {...register("convertedAmount")} />
            {errors.convertedAmount ? <small role="alert">{errors.convertedAmount.message}</small> : null}
          </label>
        ) : null}

        <label className="transaction-field">
          <span><CalendarDays aria-hidden="true" size={17} />Date and time</span>
          <input aria-label="Date and time" type="datetime-local" {...register("transactionAt")} />
          {errors.transactionAt ? <small role="alert">{errors.transactionAt.message}</small> : null}
        </label>

        <label className="transaction-field">
          <span><NotebookPen aria-hidden="true" size={17} />Note</span>
          <textarea aria-label="Note" maxLength={500} placeholder="Optional details" rows={3} {...register("description")} />
          {errors.description ? <small role="alert">{errors.description.message}</small> : null}
        </label>
      </div>

      <div className="receipt-picker">
        <Camera aria-hidden="true" size={21} />
        <div><strong>{receipt ? receipt.name : "Add a receipt"}</strong><span>PDF or image · up to 5 MB</span></div>
        <button onClick={() => receiptRef.current?.click()} type="button">{receipt ? "Change" : "Choose"}</button>
        <input accept={RECEIPT_ACCEPT} aria-label="Receipt file" className="sr-only" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} ref={receiptRef} type="file" />
      </div>

      {errors.root ? <p className="form-error" role="alert">{errors.root.message}</p> : null}
      <button className="save-transaction-button" disabled={isSubmitting || missingSetup} type="submit">{isSubmitting ? "Saving…" : kind === "transfer" ? "Transfer money" : `Save ${kind}`}</button>
    </form>
  );
}

export function TransactionComposer({ initialKind }: { initialKind: TransactionKind }) {
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const options = useQuery({ queryFn: () => getComposerOptions(kind), queryKey: ["transaction-options", kind] });

  return (
    <MobileShell>
      <div className="standard-page transaction-page">
        <PageHeader title="Add transaction" trailing={<ThemeToggle compact />} />
        <div aria-label="Transaction type" className="transaction-kind-tabs" role="group">
          {(["expense", "income", "transfer"] as const).map((option) => <button aria-pressed={kind === option} key={option} onClick={() => setKind(option)} type="button">{option}</button>)}
        </div>
        {options.isPending ? <div aria-busy="true" className="transaction-form-skeleton" /> : null}
        {options.isError ? <div className="form-load-error" role="alert"><strong>Couldn’t prepare the form</strong><button onClick={() => void options.refetch()} type="button">Try again</button></div> : null}
        {options.data ? <ComposerForm accounts={options.data.accounts} categories={options.data.categories} key={kind} kind={kind} /> : null}
      </div>
    </MobileShell>
  );
}
