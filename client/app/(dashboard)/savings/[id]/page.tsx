"use client";

import { Fragment, FormEvent, useCallback, useEffect, useState } from "react";
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
import { decimalInput, toDateOnly } from "@/lib/finance/format";
import { DollarSignIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function CreateSavingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalId = params.id;
  const isCreate = goalId === "create" || goalId === "edit";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState<Date | undefined>();

  const loadGoal = useCallback(async () => {
    if (isCreate) return;
    setIsLoading(true);
    setError(null);
    try {
      const goal = await getSavingsGoal(goalId);
      setMonthlyTarget(goal.monthly_target_amount);
      setName(goal.name);
      setNote(goal.note ?? "");
      setTargetAmount(goal.target_amount);
      setTargetDate(goal.target_date ? new Date(goal.target_date) : undefined);
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
        currency: "USD",
        monthly_target_amount: decimalInput(monthlyTarget),
        name,
        note: note || null,
        target_amount: decimalInput(targetAmount),
        target_date: toDateOnly(targetDate),
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
                      placeholder="Vacation Fund"
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
                      value={monthlyTarget}
                      onChange={(event) => setMonthlyTarget(event.target.value)}
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
                    type="date"
                    label="Targeted Date"
                    value={targetDate}
                    onChange={(value) => setTargetDate(value as Date)}
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
