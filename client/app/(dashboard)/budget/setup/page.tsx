"use client";

import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBudget, listCategories, type Category } from "@/lib/finance/api";
import {
  decimalInput,
  formatMoney,
  formatPercent,
  monthBounds,
  monthKey,
} from "@/lib/finance/format";
import { DollarSignIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";

type BudgetAmounts = Record<string, string>;

export default function SetupBudgetPage() {
  const router = useRouter();
  const [amounts, setAmounts] = useState<BudgetAmounts>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const currentMonth = monthKey();

  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      setError(null);
      try {
        setCategories(await listCategories("expense"));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Expense categories could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadCategories();
  }, []);

  const allocated = useMemo(
    () =>
      Object.values(amounts).reduce(
        (total, value) => total + Number(value || 0),
        0,
      ),
    [amounts],
  );
  const incomeAmount = Number(income || 0);
  const remaining = incomeAmount - allocated;
  const allocatedPercent = incomeAmount > 0 ? (allocated / incomeAmount) * 100 : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const entries = categories
      .map((category) => ({
        category,
        value: amounts[category.id] ?? "",
      }))
      .filter((entry) => Number(entry.value) > 0);

    if (entries.length === 0) {
      setError("Enter at least one category budget.");
      setIsSaving(false);
      return;
    }

    const bounds = monthBounds(currentMonth);
    try {
      await Promise.all(
        entries.map((entry) =>
          createBudget({
            category_id: entry.category.id,
            currency: "USD",
            limit_amount: decimalInput(entry.value),
            period_end: bounds.end,
            period_start: bounds.start,
            period_type: "monthly",
          }),
        ),
      );
      router.push("/budget");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Budgets could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateAmount(categoryId: string, value: string) {
    setAmounts((current) => ({ ...current, [categoryId]: value }));
  }

  const form = (
    <form onSubmit={handleSubmit}>
      <FieldSet>
        <FieldGroup>
          <div>
            <FieldLegend variant="legend">
              Allocate Budget for Each Category
            </FieldLegend>
            <div className="bg-secondary/60 p-3 rounded-lg">
              <div className="flex flex-wrap justify-between gap-3 mb-1.5">
                <div>
                  <span className="text-input">Income</span>
                  <h4 className="font-bold text-xl">
                    {formatMoney(incomeAmount)}
                  </h4>
                </div>
                <div>
                  <span className="text-input">Allocated</span>
                  <h4 className="font-bold text-xl">
                    {formatMoney(allocated)}
                  </h4>
                </div>
                <div>
                  <span className="text-input">Remaining</span>
                  <h4
                    className={`font-bold text-xl ${
                      remaining < 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatMoney(remaining)}
                  </h4>
                </div>
              </div>
              <Progress
                value={Math.min(allocatedPercent, 100)}
                className="h-2 mb-0.5"
              />
              <div className="flex items-center justify-between">
                <span className="text-input">
                  {formatPercent(allocatedPercent)} allocated
                </span>
              </div>
            </div>
          </div>
          {categories.map((category) => (
            <Field key={category.id}>
              <FieldLabel>{category.name}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={amounts[category.id] ?? ""}
                  onChange={(event) =>
                    updateAmount(category.id, event.target.value)
                  }
                  placeholder="0.00"
                />
                <InputGroupAddon align="inline-end">
                  {incomeAmount > 0
                    ? formatPercent(
                        (Number(amounts[category.id] || 0) / incomeAmount) *
                          100,
                      )
                    : "0%"}
                </InputGroupAddon>
              </InputGroup>
              <FieldError />
            </Field>
          ))}
          <Field>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Budget"}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  );

  return (
    <Fragment>
      <Header homeBtn={true} title="Budget Setup">
        <BackBtn />
      </Header>
      <section className="p-3 pt-6">
        <Field className="mb-6">
          <FieldLabel>Monthly Income</FieldLabel>
          <FieldDescription>
            Include all sources of monthly income after taxes.
          </FieldDescription>
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
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              placeholder="00,000.00"
              className="font-bold text-center text-5xl"
            />
          </InputGroup>
        </Field>
        {isLoading && <p className="text-input text-sm">Loading categories...</p>}
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {!isLoading && categories.length === 0 && (
          <p className="text-input text-sm">No expense categories found.</p>
        )}
        {!isLoading && categories.length > 0 && (
          <Tabs defaultValue="default" className="gap-3">
            <TabsList>
              <TabsTrigger value="default">Default</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="default">{form}</TabsContent>
            <TabsContent value="custom">{form}</TabsContent>
          </Tabs>
        )}
      </section>
    </Fragment>
  );
}
