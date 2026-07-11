"use client";

import { FormEvent, useMemo, useState } from "react";
import { Calendar, Coins, HandCoins, SquarePen } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Field, FieldError, FieldGroup, FieldSet } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "../ui/input-group";
import {
  listLoanSettlements,
  type LoanRecord,
  type LoanSettlement,
} from "@/lib/finance/api";
import { decimalInput, formatMoney } from "@/lib/finance/format";

type LoanItemProps = {
  deleteError?: string | null;
  isDeleting?: boolean;
  isSettling?: boolean;
  onDelete?: () => void;
  onSettle?: (amount: string, settledAt: string, note: string) => Promise<void>;
  personName: string;
  record: LoanRecord;
  settlementError?: string | null;
};

function dateLabel(value: string): string {
  const parsedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedValue);
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LoanItem({
  deleteError,
  isDeleting = false,
  isSettling = false,
  onDelete,
  onSettle,
  personName,
  record,
  settlementError,
}: LoanItemProps) {
  const [amount, setAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [note, setNote] = useState("");
  const [settledAt, setSettledAt] = useState(todayInputValue());
  const [settlements, setSettlements] = useState<LoanSettlement[]>([]);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);

  const percentSettled = useMemo(() => {
    const principal = Number(record.principal_amount);
    const settled = Number(record.settled_amount);
    return principal > 0 ? Math.min((settled / principal) * 100, 100) : 0;
  }, [record.principal_amount, record.settled_amount]);

  async function loadSettlements() {
    setIsLoadingSettlements(true);
    setSettlementsError(null);
    try {
      setSettlements(await listLoanSettlements(record.id));
    } catch (loadError) {
      setSettlementsError(
        loadError instanceof Error
          ? loadError.message
          : "Settlement history could not be loaded.",
      );
    } finally {
      setIsLoadingSettlements(false);
    }
  }

  async function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);
    if (nextOpen) {
      await loadSettlements();
    }
  }

  async function handleSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSettle) return;
    await onSettle(
      decimalInput(amount),
      new Date(`${settledAt}T00:00:00.000Z`).toISOString(),
      note,
    );
    setAmount("");
    setNote("");
    setSettledAt(todayInputValue());
    await loadSettlements();
  }

  const isGiven = record.direction === "given";
  const statusText = isGiven ? "Owes you" : "You owe";
  const itemTitle = isGiven ? "Given Details" : "Taken Details";
  const repayDateLabel = isGiven ? "Expected back" : "Repay by";

  return (
    <Drawer open={isOpen} onOpenChange={(open) => void handleOpenChange(open)}>
      <DrawerTrigger asChild>
        <div className="border border-input rounded-md p-3 space-y-3 text-xs">
          <div className="flex flex-wrap">
            <Button variant="secondary" size="icon">
              {isGiven ? <HandCoins /> : <Coins />}
            </Button>
            <div className="flex-1 px-1.5 min-w-0">
              <h3 className="font-bold text-base line-clamp-1">{personName}</h3>
              <h5 className="text-input line-clamp-1">{statusText}</h5>
            </div>
            <div className="text-end">
              <h4 className="font-bold text-base">
                {formatMoney(record.outstanding_amount, record.currency)}
              </h4>
              <h6 className="text-input">
                of {formatMoney(record.principal_amount, record.currency)}
              </h6>
            </div>
          </div>
          <div className="space-y-1.5">
            <p>{Math.round(percentSettled)}% settled</p>
            <Progress value={percentSettled} />
          </div>
          <div className="flex items-center justify-between text-input">
            <div className="flex items-center gap-1">
              <Calendar className="size-2.5" />
              {dateLabel(record.issued_at)}
            </div>
            <p className="capitalize">{record.status}</p>
          </div>
          <div className="flex items-center gap-1 text-input">
            <Calendar className="size-2.5" />
            {repayDateLabel}{" "}
            {record.repay_date ? dateLabel(record.repay_date) : "not set"}
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{itemTitle}</DrawerTitle>
        </DrawerHeader>
        <div className="px-3 space-y-3 overflow-y-auto">
          <div>
            <div className="flex gap-1">
              <h3 className="flex-1 font-bold text-lg line-clamp-1">
                {personName}
              </h3>
              <Link href={`/loan/${record.id}`}>
                <SquarePen className="size-4 text-secondary/80" />
              </Link>
            </div>
            <p className="text-secondary/80">{statusText}</p>
            {record.note && <p className="text-secondary/80">{record.note}</p>}
            <div className="flex items-center justify-between my-2">
              <p className="font-bold text-3xl">
                {formatMoney(record.outstanding_amount, record.currency)}
              </p>
              <p>of {formatMoney(record.principal_amount, record.currency)}</p>
            </div>
            <div className="flex items-center justify-between text-secondary/80">
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                {dateLabel(record.issued_at)}
              </div>
              <p>{formatMoney(record.settled_amount, record.currency)} settled</p>
            </div>
            <div className="mt-1 flex items-center gap-1 text-secondary/80">
              <Calendar className="size-3" />
              {repayDateLabel}{" "}
              {record.repay_date ? dateLabel(record.repay_date) : "not set"}
            </div>
          </div>
          <div className="rounded-md border border-border p-2">
            <h4 className="mb-2 font-bold">Settlement History</h4>
            {isLoadingSettlements && (
              <p className="text-sm text-secondary/80">Loading settlements...</p>
            )}
            {settlementsError && (
              <p className="text-sm text-destructive">{settlementsError}</p>
            )}
            {!isLoadingSettlements &&
              !settlementsError &&
              settlements.length === 0 && (
                <p className="text-sm text-secondary/80">
                  No settlements recorded yet.
                </p>
              )}
            <div className="space-y-1.5">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{dateLabel(settlement.settled_at)}</span>
                  <span>{formatMoney(settlement.amount, settlement.currency)}</span>
                </div>
              ))}
            </div>
          </div>
          {record.status !== "settled" && (
            <form onSubmit={handleSettlement}>
              <FieldSet className="gap-2">
                <FieldGroup>
                  <Field>
                    <InputGroup className="border-border">
                      <InputGroupInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="$0.00"
                        required
                      />
                      <InputGroupAddon className="text-primary-foreground">
                        Amount
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <InputGroup className="border-border">
                      <InputGroupInput
                        type="date"
                        value={settledAt}
                        onChange={(event) => setSettledAt(event.target.value)}
                        required
                      />
                      <InputGroupAddon className="text-primary-foreground">
                        Date
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError />
                  </Field>
                  <Field>
                    <InputGroup className="border-border">
                      <InputGroupTextarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
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
              <Button type="submit" variant="outline" disabled={isSettling}>
                {isSettling ? "Settling..." : "Settle Partially"}
              </Button>
              {settlementError && (
                <p className="mt-2 text-center text-sm text-destructive">
                  {settlementError}
                </p>
              )}
            </form>
          )}
        </div>
        <DrawerFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="reverse">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>
                Are you sure you want to delete this loan record?
              </AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {deleteError && (
            <p className="text-center text-sm text-destructive">{deleteError}</p>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
