"use client";

import {
  Fragment,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import TransactionInput from "@/components/inputs/TransactionInput";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useAuthStore } from "@/lib/auth/store";
import {
  formatAccountSelectLabel,
  getAccountById,
  getActiveAccounts,
  isAccountActive,
  resolveAccountSelectValue,
} from "@/lib/finance/accounts";
import {
  createLoanRecord,
  getLoanRecord,
  listAccounts,
  listLoanPeople,
  updateLoanRecord,
  type Account,
  type LoanPerson,
} from "@/lib/finance/api";
import { decimalInput, toDateTime } from "@/lib/finance/format";
import { DollarSignIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type LoanDirection = "given" | "taken";

function personLabel(person: LoanPerson): string {
  return `${person.name} (${person.phone_number})`;
}

function localDateValue(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const recordId = params.id;
  const isCreate = recordId === "create" || recordId === "edit";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [direction, setDirection] = useState<LoanDirection>("given");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");
  const [people, setPeople] = useState<LoanPerson[]>([]);
  const [repayDate, setRepayDate] = useState<Date | undefined>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPersonLabel, setSelectedPersonLabel] = useState("");
  const userCurrency = useAuthStore(
    (state) => state.user?.base_currency ?? "USD",
  );

  const personOptions = useMemo(() => people.map(personLabel), [people]);
  const selectedPerson = useMemo(
    () => people.find((person) => personLabel(person) === selectedPersonLabel),
    [people, selectedPersonLabel],
  );
  const accountOptions = useMemo(() => {
    const activeAccounts = getActiveAccounts(accounts);
    const selectedAccount = getAccountById(accounts, selectedAccountId);
    const visibleAccounts =
      selectedAccount && !isAccountActive(selectedAccount) && !isCreate
        ? [selectedAccount, ...activeAccounts]
        : activeAccounts;

    return visibleAccounts.map((account) => ({
      id: account.id,
      label: `${formatAccountSelectLabel(account)}${
        isAccountActive(account) ? "" : " - Disabled"
      }`,
    }));
  }, [accounts, isCreate, selectedAccountId]);
  const selectedAccountLabel =
    accountOptions.find((option) => option.id === selectedAccountId)?.label ?? "";

  const loadForm = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextAccounts, nextPeople, record] = await Promise.all([
        listAccounts(),
        listLoanPeople(),
        isCreate ? Promise.resolve(null) : getLoanRecord(recordId),
      ]);
      setAccounts(nextAccounts);
      setPeople(nextPeople);
      if (record) {
        setAmount(record.principal_amount);
        setDate(new Date(record.issued_at));
        setDirection(record.direction);
        setNote(record.note ?? "");
        setRepayDate(
          record.repay_date ? dateFromValue(record.repay_date) : new Date(),
        );
        setSelectedAccountId(
          record.account_id ?? resolveAccountSelectValue(nextAccounts),
        );
        const person = nextPeople.find((item) => item.id === record.person_id);
        setSelectedPersonLabel(person ? personLabel(person) : "");
      } else {
        setSelectedAccountId(resolveAccountSelectValue(nextAccounts));
        setSelectedPersonLabel((current) =>
          current || (nextPeople[0] ? personLabel(nextPeople[0]) : ""),
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Loan record could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isCreate, recordId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedPerson) {
      setError("Add or select a person before saving this loan.");
      return;
    }
    if (!selectedAccountId) {
      setError("Add or select an active account before saving this loan.");
      return;
    }
    if (!date || !repayDate) {
      setError("Select the loan date and repay date before saving this loan.");
      return;
    }
    if (localDateValue(repayDate) < localDateValue(date)) {
      setError("Repay date cannot be before the loan date.");
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        account_id: selectedAccountId,
        currency: userCurrency,
        direction,
        issued_at: toDateTime(date),
        note: note || null,
        person_id: selectedPerson.id,
        principal_amount: decimalInput(amount),
        repay_date: localDateValue(repayDate),
      };
      if (isCreate) {
        await createLoanRecord(body);
      } else {
        await updateLoanRecord(recordId, body);
      }
      router.push("/loan");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Loan record could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Fragment>
      <Header homeBtn={true} title={isCreate ? "Add New Loan" : "Edit Loan"}>
        <BackBtn />
      </Header>
      <section className="px-3 pt-6">
        {isLoading && <p className="text-input text-sm">Loading loan form...</p>}
        {error && (
          <div className="mb-3 space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            {!isSaving && (
              <Button type="button" variant="outline" onClick={() => void loadForm()}>
                Retry
              </Button>
            )}
          </div>
        )}
        {!isLoading && (people.length === 0 || accountOptions.length === 0) && (
          <div className="space-y-2 rounded-md border border-input p-3">
            <p className="font-bold">
              {people.length === 0
                ? "Add a person first."
                : "Add an active account first."}
            </p>
            <p className="text-input text-sm">
              {people.length === 0
                ? "Loan records need a selected person for both given and taken money."
                : "Loan records need an active account for both given and taken money."}
            </p>
            <Link href={people.length === 0 ? "/loan" : "/accounts"}>
              <Button variant="outline">
                {people.length === 0 ? "Manage People" : "Manage Accounts"}
              </Button>
            </Link>
          </div>
        )}
        {!isLoading && people.length > 0 && accountOptions.length > 0 && (
          <form onSubmit={handleSubmit}>
            <FieldSet>
              <InputGroup className="border-0 border-b rounded-none h-12">
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
              <div className="bg-secondary text-primary inline-flex h-8 p-1 w-full items-center rounded-full">
                <Button
                  onClick={() => setDirection("given")}
                  type="button"
                  variant={direction === "given" ? "default" : "ghost"}
                  className="w-1/2 rounded-full h-6"
                >
                  Given
                </Button>
                <Button
                  onClick={() => setDirection("taken")}
                  type="button"
                  variant={direction === "taken" ? "default" : "ghost"}
                  className="w-1/2 rounded-full h-6"
                >
                  Taken
                </Button>
              </div>
              <FieldGroup>
                <Field>
                  <TransactionInput
                    type="select"
                    label={
                      direction === "given"
                        ? "Give From Account"
                        : "Take Into Account"
                    }
                    list={accountOptions.map((option) => option.label)}
                    value={selectedAccountLabel}
                    onChange={(value) => {
                      if (typeof value !== "string") return;
                      const selectedOption = accountOptions.find(
                        (option) => option.label === value,
                      );
                      if (selectedOption) setSelectedAccountId(selectedOption.id);
                    }}
                  />
                  <FieldError />
                </Field>
                <Field>
                  <TransactionInput
                    type="select"
                    label="Person"
                    list={personOptions}
                    value={selectedPersonLabel}
                    onChange={(value) =>
                      typeof value === "string" && setSelectedPersonLabel(value)
                    }
                  />
                  <FieldError />
                </Field>
                <Field>
                  <TransactionInput
                    type="date"
                    label={direction === "given" ? "Given Date" : "Taken Date"}
                    value={date}
                    onChange={(value) => value instanceof Date && setDate(value)}
                  />
                  <FieldError />
                </Field>
                <Field>
                  <TransactionInput
                    type="date"
                    label={
                      direction === "given"
                        ? "Expected Return Date"
                        : "Repayment Due Date"
                    }
                    value={repayDate}
                    onChange={(value) =>
                      value instanceof Date && setRepayDate(value)
                    }
                  />
                  <FieldError />
                </Field>
                <Field>
                  <InputGroup>
                    <InputGroupTextarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Type here.."
                      className="pt-0"
                    />
                    <InputGroupAddon
                      align="block-start"
                      className="text-white font-bold"
                    >
                      Note
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError />
                </Field>
                <Field>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving
                      ? "Saving..."
                      : isCreate
                        ? direction === "given"
                          ? "Add Given Loan"
                          : "Add Taken Loan"
                        : "Save Loan"}
                  </Button>
                </Field>
              </FieldGroup>
            </FieldSet>
          </form>
        )}
      </section>
    </Fragment>
  );
}
