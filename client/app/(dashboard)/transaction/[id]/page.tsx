"use client";

import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { DollarSignIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import TransactionInput from "@/components/inputs/TransactionInput";
import BackBtn from "@/components/BackBtn";
import { useParams, useRouter } from "next/navigation";
import {
  getActiveAccounts,
  resolveAccountSelectValue,
} from "@/lib/finance/accounts";
import {
  createRecurringRule,
  createTransaction,
  createTransfer,
  getTransaction,
  listAccounts,
  listCategories,
  updateTransaction,
  type Account,
  type Category,
} from "@/lib/finance/api";
import { decimalInput, toDateTime } from "@/lib/finance/format";

const RECURRENCE_OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly"];

type FormType = "expense" | "income" | "transfer";
type AccountOption = {
  id: string;
  label: string;
};

function frequencyFromLabel(label: string) {
  return label.toLowerCase() as "daily" | "weekly" | "monthly" | "yearly";
}

function selectByName<T extends { name: string }>(items: T[], name: string) {
  return items.find((item) => item.name === name);
}

function accountDestinationLabel(account: Account): string {
  return `Account: ${account.name}`;
}

function accountSourceLabel(account: Account): string {
  return accountDestinationLabel(account);
}

export default function CreateTransactionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const transactionId = params.id;
  const isCreate = transactionId === "create" || transactionId === "edit";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [fromAccountName, setFromAccountName] = useState("");
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");
  const [recurringEvery, setRecurringEvery] = useState("Monthly");
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedExpenseSourceName, setSelectedExpenseSourceName] = useState("");
  const [toDestinationName, setToDestinationName] = useState("");
  const [type, setType] = useState<FormType>("expense");

  const activeAccounts = useMemo(() => getActiveAccounts(accounts), [accounts]);
  const accountNames = useMemo(
    () => activeAccounts.map((account) => account.name),
    [activeAccounts],
  );
  const incomeAccounts = activeAccounts;
  const incomeAccountNames = useMemo(
    () => incomeAccounts.map((account) => account.name),
    [incomeAccounts],
  );
  const activeCategories = type === "income" ? incomeCategories : expenseCategories;
  const activeCategoryNames = useMemo(
    () => activeCategories.map((category) => category.name),
    [activeCategories],
  );
  const expenseSources = useMemo<AccountOption[]>(
    () =>
      activeAccounts.map((account) => ({
        id: account.id,
        label: accountSourceLabel(account),
      })),
    [activeAccounts],
  );
  const expenseSourceNames = useMemo(
    () => expenseSources.map((source) => source.label),
    [expenseSources],
  );
  const transferDestinations = useMemo<AccountOption[]>(
    () =>
      activeAccounts.map((account) => ({
        id: account.id,
        label: accountDestinationLabel(account),
      })),
    [activeAccounts],
  );
  const transferDestinationNames = useMemo(
    () => transferDestinations.map((destination) => destination.label),
    [transferDestinations],
  );

  const loadData = useCallback(async (config?: { signal?: AbortSignal }) => {
    const signal = config?.signal;
    setIsLoading(true);
    setError(null);
    try {
      const [nextAccounts, nextExpenses, nextIncome, transaction] =
        await Promise.all([
          listAccounts({ signal }),
          listCategories("expense", { signal }),
          listCategories("income", { signal }),
          isCreate ? Promise.resolve(null) : getTransaction(transactionId, { signal }),
        ]);

      if (signal?.aborted) return;

      setAccounts(nextAccounts);
      setExpenseCategories(nextExpenses);
      setIncomeCategories(nextIncome);

      if (transaction) {
        const nextType =
          transaction.type === "income"
            ? "income"
            : transaction.type === "expense"
              ? "expense"
              : "transfer";
        const nextCategories = nextType === "income" ? nextIncome : nextExpenses;
        setType(nextType);
        setAmount(transaction.amount);
        setDate(new Date(transaction.transaction_at));
        setNote(transaction.description ?? "");
        const transactionAccount = nextAccounts.find(
          (account) => account.id === transaction.account_id,
        );
        setSelectedAccountName(transactionAccount?.name ?? "");
        setSelectedExpenseSourceName(
          transactionAccount ? accountSourceLabel(transactionAccount) : "",
        );
        setSelectedCategoryName(
          nextCategories.find(
            (category) => category.id === transaction.category_id,
          )?.name ?? "",
        );
      } else {
        const nextActiveAccounts = getActiveAccounts(nextAccounts);
        const initialAccountId = resolveAccountSelectValue(nextAccounts);
        const initialAccount = nextAccounts.find(
          (account) => account.id === initialAccountId,
        );
        const initialTransferDestination = nextActiveAccounts.find(
          (account) => account.id !== initialAccountId,
        );
        if (!initialAccount) {
          setError(
            "No active account is available. Create or enable an account before saving a transaction.",
          );
        }
        setSelectedAccountName(
          (current) => current || initialAccount?.name || "",
        );
        setSelectedExpenseSourceName(
          (current) =>
            current ||
            (initialAccount ? accountSourceLabel(initialAccount) : ""),
        );
        setFromAccountName((current) => current || initialAccount?.name || "");
        setToDestinationName(
          (current) =>
            current ||
            (initialTransferDestination
              ? accountDestinationLabel(initialTransferDestination)
              : ""),
        );
        setSelectedCategoryName((current) => current || nextExpenses[0]?.name || "");
      }
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Transaction details could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [isCreate, transactionId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadData]);

  useEffect(() => {
    if (type === "transfer") return;
    const options = type === "income" ? incomeCategories : expenseCategories;
    if (!options.some((category) => category.name === selectedCategoryName)) {
      setSelectedCategoryName(options[0]?.name ?? "");
    }
  }, [expenseCategories, incomeCategories, selectedCategoryName, type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const transactionAt = toDateTime(date);
    const decimalAmount = decimalInput(amount);
    const selectedExpenseSource = expenseSources.find(
      (source) => source.label === selectedExpenseSourceName,
    );
    const selectedExpenseAccount = activeAccounts.find(
      (account) => account.id === selectedExpenseSource?.id,
    );
    const selectedAccount =
      type === "expense"
        ? selectedExpenseAccount
        : type === "income"
          ? selectByName(incomeAccounts, selectedAccountName)
          : selectByName(activeAccounts, selectedAccountName);
    const selectedCategory = selectByName(activeCategories, selectedCategoryName);
    const fromAccount = selectByName(activeAccounts, fromAccountName);
    const transferDestination = transferDestinations.find(
      (destination) => destination.label === toDestinationName,
    );
    const toAccount = activeAccounts.find(
      (account) => account.id === transferDestination?.id,
    );

    if (type === "transfer") {
      if (!fromAccount || !toAccount) {
        setError("Choose where to transfer the money.");
        return;
      }
      if (fromAccount.id === toAccount.id) {
        setError("Choose two different accounts for the transfer.");
        return;
      }
    } else if (!selectedAccount || !selectedCategory) {
      setError("Choose an account and category before saving.");
      return;
    }

    setIsSaving(true);
    try {
      if (type === "transfer" && fromAccount && toAccount) {
        await createTransfer({
          amount: decimalAmount,
          description: note || null,
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          transaction_at: transactionAt,
        });
      } else if (isCreate && isRecurring && selectedAccount && selectedCategory) {
        const transactionType = type === "income" ? "income" : "expense";
        await createRecurringRule({
          account_id: selectedAccount.id,
          amount: decimalAmount,
          category_id: selectedCategory.id,
          description: note || null,
          frequency: frequencyFromLabel(recurringEvery),
          interval_count: 1,
          start_at: transactionAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          transaction_type: transactionType,
        });
      } else if (isCreate && selectedAccount && selectedCategory) {
        const transactionType = type === "income" ? "income" : "expense";
        await createTransaction({
          account_id: selectedAccount.id,
          amount: decimalAmount,
          category_id: selectedCategory.id,
          description: note || null,
          transaction_at: transactionAt,
          type: transactionType,
        });
      } else if (selectedAccount && selectedCategory) {
        await updateTransaction(transactionId, {
          account_id: selectedAccount.id,
          amount: decimalAmount,
          category_id: selectedCategory.id,
          description: note || null,
          transaction_at: transactionAt,
        });
      }
      router.push("/transaction");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Transaction could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const formTitle = isCreate ? "Add New Transaction" : "Edit Transaction";
  const submitLabel = isSaving
    ? "Saving..."
    : isCreate
      ? type === "transfer"
        ? "Add Transfer"
        : isRecurring
          ? "Add Recurring Rule"
          : "Add Transaction"
      : "Save Transaction";

  return (
    <Fragment>
      <Header homeBtn={true} title={formTitle}>
        <BackBtn />
      </Header>
      <section className="px-3 pt-6">
        {isLoading && <p className="text-input text-sm">Loading form...</p>}
        {error && (
          <div className="mb-3 space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            {!isSaving && (
              <Button type="button" variant="outline" onClick={() => void loadData()}>
                Retry
              </Button>
            )}
          </div>
        )}
        {!isLoading && (
          <form onSubmit={handleSubmit}>
            <InputGroup className="border-0 border-b rounded-none h-12 mb-6">
              <InputGroupAddon>
                <InputGroupText>
                  <DollarSignIcon />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="font-bold text-center text-5xl"
                required
              />
            </InputGroup>
            <Tabs
              value={type}
              onValueChange={(value) => setType(value as FormType)}
            >
              <TabsList>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="transfer" disabled={!isCreate}>
                  Transfer
                </TabsTrigger>
              </TabsList>
              <TabsContent value="expense">
                <TransactionFields
                  accountLabel="Account"
                  accountNames={expenseSourceNames}
                  categoryLabel="Category"
                  categoryNames={activeCategoryNames}
                  date={date}
                  isRecurring={isRecurring}
                  note={note}
                  recurringEvery={recurringEvery}
                  selectedAccountName={selectedExpenseSourceName}
                  selectedCategoryName={selectedCategoryName}
                  setDate={setDate}
                  setIsRecurring={setIsRecurring}
                  setNote={setNote}
                  setRecurringEvery={setRecurringEvery}
                  setSelectedAccountName={setSelectedExpenseSourceName}
                  setSelectedCategoryName={setSelectedCategoryName}
                  showRecurring={isCreate}
                  submitLabel={submitLabel}
                />
              </TabsContent>
              <TabsContent value="income">
                <TransactionFields
                  accountNames={incomeAccountNames}
                  categoryLabel="Source"
                  categoryNames={activeCategoryNames}
                  date={date}
                  isRecurring={isRecurring}
                  note={note}
                  recurringEvery={recurringEvery}
                  selectedAccountName={selectedAccountName}
                  selectedCategoryName={selectedCategoryName}
                  setDate={setDate}
                  setIsRecurring={setIsRecurring}
                  setNote={setNote}
                  setRecurringEvery={setRecurringEvery}
                  setSelectedAccountName={setSelectedAccountName}
                  setSelectedCategoryName={setSelectedCategoryName}
                  showRecurring={isCreate}
                  submitLabel={submitLabel}
                />
              </TabsContent>
              <TabsContent value="transfer">
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <TransactionInput
                        type="select"
                        label="From Account"
                        list={accountNames}
                        value={fromAccountName}
                        onChange={(value) => setFromAccountName(String(value))}
                      />
                      <FieldError />
                    </Field>
                    <Field>
                      <TransactionInput
                        type="select"
                        label="To"
                        list={transferDestinationNames}
                        value={toDestinationName}
                        onChange={(value) => setToDestinationName(String(value))}
                      />
                      <FieldError />
                    </Field>
                    <Field>
                      <TransactionInput
                        type="date"
                        label="Date"
                        value={date}
                        onChange={(value) => setDate(value as Date)}
                      />
                      <FieldError />
                    </Field>
                    <NoteField note={note} setNote={setNote} />
                    <Field>
                      <Button type="submit" disabled={isSaving}>
                        {submitLabel}
                      </Button>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </TabsContent>
            </Tabs>
          </form>
        )}
      </section>
    </Fragment>
  );
}

type TransactionFieldsProps = {
  accountLabel?: string;
  accountNames: string[];
  categoryLabel: string;
  categoryNames: string[];
  date: Date | undefined;
  isRecurring: boolean;
  note: string;
  recurringEvery: string;
  selectedAccountName: string;
  selectedCategoryName: string;
  setDate: (date: Date | undefined) => void;
  setIsRecurring: (value: boolean) => void;
  setNote: (value: string) => void;
  setRecurringEvery: (value: string) => void;
  setSelectedAccountName: (value: string) => void;
  setSelectedCategoryName: (value: string) => void;
  showRecurring: boolean;
  submitLabel: string;
};

function TransactionFields({
  accountLabel = "Account",
  accountNames,
  categoryLabel,
  categoryNames,
  date,
  isRecurring,
  note,
  recurringEvery,
  selectedAccountName,
  selectedCategoryName,
  setDate,
  setIsRecurring,
  setNote,
  setRecurringEvery,
  setSelectedAccountName,
  setSelectedCategoryName,
  showRecurring,
  submitLabel,
}: TransactionFieldsProps) {
  return (
    <FieldSet>
      <FieldGroup>
        <Field>
          <TransactionInput
            type="select"
            label={accountLabel}
            list={accountNames}
            value={selectedAccountName}
            onChange={(value) => setSelectedAccountName(String(value))}
          />
          <FieldError />
        </Field>
        <Field>
          <TransactionInput
            type="select"
            label={categoryLabel}
            list={categoryNames}
            value={selectedCategoryName}
            onChange={(value) => setSelectedCategoryName(String(value))}
          />
          <FieldError />
        </Field>
        <Field>
          <TransactionInput
            type="date"
            label="Date"
            value={date}
            onChange={(value) => setDate(value as Date)}
          />
          <FieldError />
        </Field>
        {showRecurring && (
          <Fragment>
            <Field>
              <TransactionInput
                type="boolean"
                label="Recurring"
                value={isRecurring}
                onChange={(value) => setIsRecurring(Boolean(value))}
              />
              <FieldError />
            </Field>
            {isRecurring && (
              <Field>
                <TransactionInput
                  type="select"
                  label="Recurring Every"
                  list={RECURRENCE_OPTIONS}
                  value={recurringEvery}
                  onChange={(value) => setRecurringEvery(String(value))}
                />
                <FieldError />
              </Field>
            )}
          </Fragment>
        )}
        <NoteField note={note} setNote={setNote} />
        <Field>
          <Button type="submit">{submitLabel}</Button>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function NoteField({
  note,
  setNote,
}: {
  note: string;
  setNote: (value: string) => void;
}) {
  return (
    <Field>
      <InputGroup>
        <InputGroupTextarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Type here.."
          className="pt-0"
        />
        <InputGroupAddon align="block-start" className="text-white font-bold">
          Note
        </InputGroupAddon>
      </InputGroup>
      <FieldError />
    </Field>
  );
}
