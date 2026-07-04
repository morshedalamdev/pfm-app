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
import {
  createSavingsGoal,
  getSavingsGoal,
  updateSavingsGoal,
} from "@/lib/finance/api";
import { useAuthStore } from "@/lib/auth/store";
import { decimalInput } from "@/lib/finance/format";
import { DollarSignIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const DEFAULT_TARGET_MONTHS = 3;
const TARGET_MONTH_OPTIONS = [3, 5, 6, 9, 12, 18, 24, 36];

function targetMonthLabel(months: number): string {
  return `${months} month${months === 1 ? "" : "s"}`;
}

function parseTargetMonth(value: string | boolean | Date | undefined): number {
  if (typeof value !== "string") return DEFAULT_TARGET_MONTHS;
  const months = Number(value.replace(/\D/g, ""));
  return Number.isFinite(months) && months > 0 ? months : DEFAULT_TARGET_MONTHS;
}

function dateOnlyAfterMonths(months: number): string {
  const today = new Date();
  const targetMonth = today.getUTCMonth() + months;
  const targetYear = today.getUTCFullYear();
  const targetDay = today.getUTCDate();
  const lastTargetDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(targetYear, targetMonth, Math.min(targetDay, lastTargetDay)),
  )
    .toISOString()
    .slice(0, 10);
}

function monthsUntilTargetDate(targetDate?: string | null): number {
  if (!targetDate) return DEFAULT_TARGET_MONTHS;
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  if (Number.isNaN(target.getTime())) return DEFAULT_TARGET_MONTHS;

  const today = new Date();
  const monthDiff =
    (target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
    target.getUTCMonth() -
    today.getUTCMonth();
  const includesPartialMonth = target.getUTCDate() > today.getUTCDate();
  return Math.max(1, monthDiff + (includesPartialMonth ? 1 : 0));
}

export default function CreateSavingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalId = params.id;
  const isCreate = goalId === "create" || goalId === "edit";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetMonths, setTargetMonths] = useState(DEFAULT_TARGET_MONTHS);
  const userCurrency = useAuthStore(
    (state) => state.user?.base_currency ?? "USD",
  );

  const targetMonthOptions = useMemo(
    () =>
      Array.from(new Set([...TARGET_MONTH_OPTIONS, targetMonths]))
        .sort((left, right) => left - right)
        .map(targetMonthLabel),
    [targetMonths],
  );

  const calculatedMonthlyTarget = useMemo(() => {
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount <= 0 || targetMonths <= 0) {
      return "";
    }
    return (amount / targetMonths).toFixed(2);
  }, [targetAmount, targetMonths]);

  const loadGoal = useCallback(async () => {
    if (isCreate) return;
    setIsLoading(true);
    setError(null);
    try {
      const goal = await getSavingsGoal(goalId);
      setName(goal.name);
      setNote(goal.note ?? "");
      setTargetAmount(goal.target_amount);
      setTargetMonths(monthsUntilTargetDate(goal.target_date));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Savings goal could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [goalId, isCreate]);

  useEffect(() => {
    void loadGoal();
  }, [loadGoal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const body = {
        currency: userCurrency,
        monthly_target_amount: decimalInput(calculatedMonthlyTarget),
        name,
        note: note || null,
        target_amount: decimalInput(targetAmount),
        target_date: dateOnlyAfterMonths(targetMonths),
      };
      if (isCreate) {
        await createSavingsGoal(body);
      } else {
        await updateSavingsGoal(goalId, body);
      }
      router.push("/savings");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Savings goal could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Fragment>
      <Header homeBtn={true} title={isCreate ? "Add New Goal" : "Edit Goal"}>
        <BackBtn />
      </Header>
      <section className="px-3 pt-6">
        {isLoading && <p className="text-input text-sm">Loading goal...</p>}
        {error && (
          <div className="mb-3 space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            {!isCreate && (
              <Button type="button" variant="outline" onClick={() => void loadGoal()}>
                Retry
              </Button>
            )}
          </div>
        )}
        {!isLoading && (
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
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="0.00"
                  className="font-bold text-center text-5xl"
                  required
                />
              </InputGroup>
              <FieldGroup>
                <Field>
                  <InputGroup>
                    <InputGroupInput
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Goal name"
                      required
                    />
                    <InputGroupAddon className="text-white font-bold">
                      Goal Name:
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError />
                </Field>
                <Field>
                  <InputGroup>
                    <InputGroupInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={calculatedMonthlyTarget}
                      readOnly
                      aria-readonly="true"
                      placeholder="$0.00"
                    />
                    <InputGroupAddon className="text-white font-bold">
                      Monthly Saving:
                    </InputGroupAddon>
                  </InputGroup>
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
                  <TransactionInput
                    type="select"
                    label="Targeted Months"
                    list={targetMonthOptions}
                    value={targetMonthLabel(targetMonths)}
                    onChange={(value) =>
                      setTargetMonths(parseTargetMonth(value))
                    }
                  />
                  <FieldError />
                </Field>
                <Field>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving
                      ? "Saving..."
                      : isCreate
                        ? "Add Goal"
                        : "Save Goal"}
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
