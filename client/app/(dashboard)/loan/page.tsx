"use client";

import {
  Fragment,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import FilterLoan from "@/components/filters/FilterLoan";
import Header from "@/components/Header";
import HeaderItem from "@/components/items/HeaderItem";
import LoanItem from "@/components/items/LoanItem";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useAuthStore } from "@/lib/auth/store";
import {
  createLoanPerson,
  createLoanSettlement,
  deleteLoanPerson,
  deleteLoanRecord,
  getLoanSummary,
  listAccounts,
  listLoanPeople,
  listLoanRecords,
  updateLoanPerson,
  type Account,
  type LoanDirectionFilter,
  type LoanPerson,
  type LoanRecord,
  type LoanSummary,
} from "@/lib/finance/api";
import { formatMoney } from "@/lib/finance/format";
import { PlusIcon, SearchIcon, UserRoundCogIcon } from "lucide-react";
import Link from "next/link";

type PersonFormState = {
  id: string | null;
  name: string;
  note: string;
  phoneNumber: string;
};

type ContactPickerContact = {
  name?: string[];
  tel?: string[];
};

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select?: (
      properties: ("name" | "tel")[],
      options?: { multiple?: boolean },
    ) => Promise<ContactPickerContact[]>;
  };
};

const emptyPersonForm: PersonFormState = {
  id: null,
  name: "",
  note: "",
  phoneNumber: "",
};

export default function LoanPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [direction, setDirection] = useState<LoanDirectionFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPeopleSaving, setIsPeopleSaving] = useState(false);
  const [people, setPeople] = useState<LoanPerson[]>([]);
  const [personError, setPersonError] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonFormState>(emptyPersonForm);
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [search, setSearch] = useState("");
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlingRecordId, setSettlingRecordId] = useState<string | null>(null);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const userCurrency = useAuthStore(
    (state) => state.user?.base_currency ?? "USD",
  );

  const loadLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextAccounts = await listAccounts({ includeArchived: true });
      const [nextPeople, nextRecords, nextSummary] = await Promise.all([
        listLoanPeople(),
        listLoanRecords({ direction, status: "all" }),
        getLoanSummary(userCurrency),
      ]);
      setAccounts(nextAccounts);
      setPeople(nextPeople);
      setRecords(nextRecords);
      setSummary(nextSummary);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Loan records could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [direction, userCurrency]);

  useEffect(() => {
    void loadLoans();
  }, [loadLoans]);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const visibleRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return records;
    return records.filter((record) => {
      const person = peopleById.get(record.person_id);
      return [
        person?.name,
        person?.phone_number,
        record.note,
        record.direction,
        record.status,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [peopleById, records, search]);

  function startEditingPerson(person: LoanPerson) {
    setPersonError(null);
    setPersonForm({
      id: person.id,
      name: person.name,
      note: person.note ?? "",
      phoneNumber: person.phone_number,
    });
  }

  async function handlePersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonError(null);
    setIsPeopleSaving(true);
    try {
      const body = {
        name: personForm.name,
        note: personForm.note || null,
        phone_number: personForm.phoneNumber,
      };
      if (personForm.id) {
        await updateLoanPerson(personForm.id, body);
      } else {
        await createLoanPerson(body);
      }
      setPersonForm(emptyPersonForm);
      await loadLoans();
    } catch (saveError) {
      setPersonError(
        saveError instanceof Error
          ? saveError.message
          : "Person could not be saved.",
      );
    } finally {
      setIsPeopleSaving(false);
    }
  }

  async function handlePersonDelete(personId: string) {
    setPersonError(null);
    try {
      await deleteLoanPerson(personId);
      if (personForm.id === personId) {
        setPersonForm(emptyPersonForm);
      }
      await loadLoans();
    } catch (deletePersonError) {
      setPersonError(
        deletePersonError instanceof Error
          ? deletePersonError.message
          : "Person could not be archived.",
      );
    }
  }

  async function handleDeleteRecord(recordId: string) {
    setDeleteError(null);
    setDeletingRecordId(recordId);
    try {
      await deleteLoanRecord(recordId);
      await loadLoans();
    } catch (deleteRecordError) {
      setDeleteError(
        deleteRecordError instanceof Error
          ? deleteRecordError.message
          : "Loan record could not be deleted.",
      );
    } finally {
      setDeletingRecordId(null);
    }
  }

  async function handleSettlement(
    recordId: string,
    amount: string,
    settledAt: string,
    note: string,
  ) {
    setSettlementError(null);
    setSettlingRecordId(recordId);
    try {
      await createLoanSettlement(recordId, {
        amount,
        note: note || null,
        settled_at: settledAt,
      });
      await loadLoans();
    } catch (settleError) {
      setSettlementError(
        settleError instanceof Error
          ? settleError.message
          : "Settlement could not be saved.",
      );
    } finally {
      setSettlingRecordId(null);
    }
  }

  return (
    <Fragment>
      <Header title="Loan & Debt">
        <div className="flex items-center gap-1.5">
          <PeopleDrawer
            error={personError}
            form={personForm}
            isSaving={isPeopleSaving}
            onArchive={(personId) => void handlePersonDelete(personId)}
            onChange={setPersonForm}
            onEdit={startEditingPerson}
            onReset={() => setPersonForm(emptyPersonForm)}
            onSubmit={handlePersonSubmit}
            people={people}
          />
          <Link href="/loan/create">
            <Button variant="link" size="icon-sm" aria-label="Add loan">
              <PlusIcon />
            </Button>
          </Link>
        </div>
      </Header>
      <section
        aria-label="Loan due summary"
        className="grid grid-cols-2 gap-2 p-3 pb-0"
      >
        <HeaderItem
          title="Given Loan Due"
          amount={formatMoney(summary?.total_loan_given ?? "0", userCurrency)}
        />
        <HeaderItem
          title="Taken Loan Due"
          amount={formatMoney(summary?.total_loan_taken ?? "0", userCurrency)}
        />
      </section>
      <section className="flex items-center justify-between gap-1.5 p-3">
        <InputGroup className="mr-1.5">
          <InputGroupInput
            placeholder="Search..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon className="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
        <FilterLoan value={direction} onChange={setDirection} />
      </section>
      <section className="h-[calc(100%-214px)] space-y-3 overflow-y-auto p-3 pb-[70px]">
        {isLoading && <p className="text-input text-sm">Loading loans...</p>}
        {error && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadLoans()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && visibleRecords.length === 0 && (
          <div className="border border-input rounded-md p-3 space-y-1.5">
            <h2 className="font-bold text-base">No loan records found.</h2>
            <p className="text-input text-sm">
              Add a person, then create a given or taken loan record.
            </p>
          </div>
        )}
        {!isLoading &&
          !error &&
          visibleRecords.map((record) => (
            <LoanItem
              key={record.id}
              deleteError={deletingRecordId === record.id ? deleteError : null}
              isDeleting={deletingRecordId === record.id}
              isSettling={settlingRecordId === record.id}
              onDelete={() => void handleDeleteRecord(record.id)}
              onSettle={(amount, settledAt, note) =>
                handleSettlement(record.id, amount, settledAt, note)
              }
              personName={peopleById.get(record.person_id)?.name ?? "Unknown person"}
              record={record}
              displayCurrency={
                accountsById.get(record.account_id ?? "")?.currency ?? record.currency
              }
              settlementError={
                settlingRecordId === record.id ? settlementError : null
              }
            />
          ))}
      </section>
    </Fragment>
  );
}

function PeopleDrawer({
  error,
  form,
  isSaving,
  onArchive,
  onChange,
  onEdit,
  onReset,
  onSubmit,
  people,
}: {
  error: string | null;
  form: PersonFormState;
  isSaving: boolean;
  onArchive: (personId: string) => void;
  onChange: (form: PersonFormState) => void;
  onEdit: (person: LoanPerson) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  people: LoanPerson[];
}) {
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [isPickingContact, setIsPickingContact] = useState(false);

  async function handleSelectContact() {
    setContactMessage(null);

    const contacts = (navigator as ContactPickerNavigator).contacts;
    if (!contacts?.select) {
      setContactMessage("Contact picking is not available in this browser.");
      return;
    }

    setIsPickingContact(true);
    try {
      const [contact] = await contacts.select(["name", "tel"], {
        multiple: false,
      });

      if (!contact) {
        setContactMessage("No contact selected.");
        return;
      }

      const selectedName = contact.name?.find(Boolean)?.trim() ?? "";
      const selectedPhone = contact.tel?.find(Boolean)?.trim() ?? "";

      if (!selectedName && !selectedPhone) {
        setContactMessage("Selected contact has no name or phone number.");
        return;
      }

      onChange({
        ...form,
        name: selectedName || form.name,
        phoneNumber: selectedPhone || form.phoneNumber,
      });

      if (!selectedName) {
        setContactMessage("Selected contact has no name. Phone number filled.");
      } else if (!selectedPhone) {
        setContactMessage("Selected contact has no phone number. Name filled.");
      } else {
        setContactMessage("Contact details filled.");
      }
    } catch (contactError) {
      const errorName =
        contactError instanceof DOMException ? contactError.name : "";
      if (errorName === "AbortError") {
        setContactMessage("Contact selection was cancelled.");
      } else if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setContactMessage("Contact permission was denied.");
      } else {
        setContactMessage("Contact could not be selected.");
      }
    } finally {
      setIsPickingContact(false);
    }
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="link" size="icon-sm" aria-label="Manage loan people">
          <UserRoundCogIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>People</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-3 overflow-y-auto px-3 pb-3">
          <form onSubmit={onSubmit}>
            <FieldSet className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSelectContact()}
                disabled={isPickingContact}
              >
                {isPickingContact ? "Selecting..." : "Select from contacts"}
              </Button>
              {contactMessage && (
                <p className="text-sm text-secondary/80">{contactMessage}</p>
              )}
              <FieldGroup>
                <Field>
                  <InputGroup className="border-border">
                    <InputGroupInput
                      value={form.name}
                      onChange={(event) =>
                        onChange({ ...form, name: event.target.value })
                      }
                      placeholder="Person name"
                      required
                    />
                    <InputGroupAddon className="text-primary-foreground">
                      Name
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError />
                </Field>
                <Field>
                  <InputGroup className="border-border">
                    <InputGroupInput
                      value={form.phoneNumber}
                      onChange={(event) =>
                        onChange({ ...form, phoneNumber: event.target.value })
                      }
                      placeholder="Phone number"
                      required
                    />
                    <InputGroupAddon className="text-primary-foreground">
                      Phone
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError />
                </Field>
                <Field>
                  <InputGroup className="border-border">
                    <InputGroupTextarea
                      value={form.note}
                      onChange={(event) =>
                        onChange({ ...form, note: event.target.value })
                      }
                      placeholder="Type here.."
                      className="pt-0"
                    />
                    <InputGroupAddon
                      align="block-start"
                      className="text-primary-foreground"
                    >
                      Note
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError />
                </Field>
              </FieldGroup>
            </FieldSet>
            <div className="mt-2 flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : form.id
                    ? "Save Person"
                    : "Add Person"}
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={onReset}>
                  New
                </Button>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </form>
          <div className="space-y-2">
            {people.length === 0 && (
              <p className="text-sm text-secondary/80">No people added yet.</p>
            )}
            {people.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-2 rounded-md border border-border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{person.name}</p>
                  <p className="text-sm text-secondary/80">
                    {person.phone_number}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-auto"
                  onClick={() => onEdit(person)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="reverse"
                  className="w-auto"
                  onClick={() => onArchive(person.id)}
                >
                  Archive
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
