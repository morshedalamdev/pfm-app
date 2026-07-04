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
import {
  createBudget,
  deleteBudget,
  listBudgets,
  listCategories,
  updateBudget,
  type Budget,
  type Category,
} from "@/lib/finance/api";
import { useAuthStore } from "@/lib/auth/store";
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
type BudgetLookup = Record<string, Budget>;
type BudgetSetupTab = "details" | "custom";

export default function SetupBudgetPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BudgetSetupTab>("details");
  const [amounts, setAmounts] = useState<BudgetAmounts>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [existingBudgets, setExistingBudgets] = useState<BudgetLookup>({});
  const [existingMonthlyBudget, setExistingMonthlyBudget] =
    useState<Budget | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const userCurrency = useAuthStore(
    (state) => state.user?.base_currency ?? "USD",
  );
  const currentMonth = monthKey();

  useEffect(() => {
    async function loadBudgetSetup() {
      setIsLoading(true);
      setError(null);
      try {
        const [expenseCategories, currentBudgets] = await Promise.all([
          listCategories("expense"),
          listBudgets(currentMonth),
        ]);
        const budgetLookup = currentBudgets.reduce<BudgetLookup>(
          (lookup, budget) => {
            if (budget.category_id) {
              lookup[budget.category_id] = budget;
            }
            return lookup;
          },
          {},
        );
        const globalBudget =
          currentBudgets.find((budget) => budget.category_id === null) ?? null;
        setCategories(expenseCategories);
        setExistingBudgets(budgetLookup);
        setExistingMonthlyBudget(globalBudget);
        setMonthlyBudget(
          globalBudget ? Number(globalBudget.limit_amount).toFixed(2) : "",
        );
        setAmounts(
          expenseCategories.reduce<BudgetAmounts>((nextAmounts, category) => {
            const budget = budgetLookup[category.id];
            if (budget) {
              nextAmounts[category.id] = Number(budget.limit_amount).toFixed(2);
            }
            return nextAmounts;
          }, {}),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Budget setup data could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadBudgetSetup();
  }, [currentMonth]);

  const allocated = useMemo(
    () =>
      Object.values(amounts).reduce(
        (total, value) => total + Number(value || 0),
        0,
      ),
    [amounts],
  );
  const monthlyBudgetAmount = Number(monthlyBudget || 0);
  const remaining = monthlyBudgetAmount - allocated;
  const allocatedPercent =
    monthlyBudgetAmount > 0 ? (allocated / monthlyBudgetAmount) * 100 : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const bounds = monthBounds(currentMonth);
    const operations: Promise<unknown>[] = [];
    const monthlyBudgetValue = Number(monthlyBudget || 0);

    if (monthlyBudgetValue > 0) {
      const body = {
        currency: userCurrency,
        limit_amount: decimalInput(monthlyBudget),
      };
      operations.push(
        existingMonthlyBudget
          ? updateBudget(existingMonthlyBudget.id, body)
          : createBudget({
              ...body,
              category_id: null,
              period_end: bounds.end,
              period_start: bounds.start,
              period_type: "monthly",
            }),
      );
    } else if (existingMonthlyBudget) {
      operations.push(deleteBudget(existingMonthlyBudget.id));
    }

    categories.forEach((category) => {
      const value = amounts[category.id] ?? "";
      const budget = existingBudgets[category.id];
      const hasAmount = Number(value) > 0;

      if (hasAmount) {
        const body = {
          currency: userCurrency,
          limit_amount: decimalInput(value),
        };
        operations.push(
          budget
            ? updateBudget(budget.id, body)
            : createBudget({
                ...body,
                category_id: category.id,
                period_end: bounds.end,
                period_start: bounds.start,
                period_type: "monthly",
              }),
        );
        return;
      }

      if (budget) {
        operations.push(deleteBudget(budget.id));
      }
    });

    const hasPositiveAmount =
      monthlyBudgetValue > 0 ||
      categories.some((category) => Number(amounts[category.id] || 0) > 0);

    if (!hasPositiveAmount && operations.length === 0) {
      setError("Enter a monthly budget or at least one category budget.");
      setIsSaving(false);
      return;
    }

    try {
      await Promise.all(operations);
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

  const details = (
    <div className="space-y-3">
      <div className="bg-secondary/60 p-3 rounded-lg">
        <div className="flex flex-wrap justify-between gap-3 mb-1.5">
          <div>
            <span className="text-input">Monthly Budget</span>
            <h4 className="font-bold text-xl">
              {formatMoney(monthlyBudgetAmount, userCurrency)}
            </h4>
          </div>
          <div>
            <span className="text-input">Allocated</span>
            <h4 className="font-bold text-xl">
              {formatMoney(allocated, userCurrency)}
            </h4>
          </div>
          <div>
            <span className="text-input">Remaining</span>
            <h4
              className={`font-bold text-xl ${
                remaining < 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {formatMoney(remaining, userCurrency)}
            </h4>
          </div>
        </div>
        <Progress value={Math.min(allocatedPercent, 100)} className="h-2 mb-0.5" />
        <div className="flex items-center justify-between">
          <span className="text-input">
            {formatPercent(allocatedPercent)} allocated
          </span>
        </div>
      </div>
      <FieldSet>
        <FieldGroup>
          <FieldLegend variant="legend">Current Budget Details</FieldLegend>
          {categories.map((category) => {
            const amount = amounts[category.id] ?? "";
            const amountNumber = Number(amount || 0);
            return (
              <div
                className="border border-input rounded-md p-3 flex items-center justify-between gap-3"
                key={category.id}
              >
                <div>
                  <h3 className="font-bold text-base">{category.name}</h3>
                  <p className="text-input text-sm">
                    {monthlyBudgetAmount > 0
                      ? `${formatPercent((amountNumber / monthlyBudgetAmount) * 100)} of monthly budget`
                      : "No monthly budget set"}
                  </p>
                </div>
                <p className="font-bold text-base">
                  {formatMoney(amountNumber, userCurrency)}
                </p>
              </div>
            );
          })}
        </FieldGroup>
      </FieldSet>
    </div>
  );

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
                  <span className="text-input">Monthly Budget</span>
                  <h4 className="font-bold text-xl">
                    {formatMoney(monthlyBudgetAmount, userCurrency)}
                  </h4>
                </div>
                <div>
                  <span className="text-input">Allocated</span>
                  <h4 className="font-bold text-xl">
                    {formatMoney(allocated, userCurrency)}
                  </h4>
                </div>
                <div>
                  <span className="text-input">Remaining</span>
                  <h4
                    className={`font-bold text-xl ${
                      remaining < 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatMoney(remaining, userCurrency)}
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
                  {monthlyBudgetAmount > 0
                    ? formatPercent(
                        (Number(amounts[category.id] || 0) /
                          monthlyBudgetAmount) *
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
          <FieldLabel>Monthly Budget</FieldLabel>
          <FieldDescription>
            Set the total amount available for this month's budget.
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
              value={monthlyBudget}
              onChange={(event) => setMonthlyBudget(event.target.value)}
              placeholder="00,000.00"
              className="font-bold text-center text-5xl"
              readOnly={activeTab === "details"}
            />
          </InputGroup>
        </Field>
        {isLoading && <p className="text-input text-sm">Loading categories...</p>}
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {!isLoading && categories.length === 0 && (
          <p className="text-input text-sm">No expense categories found.</p>
        )}
        {!isLoading && categories.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as BudgetSetupTab)}
            className="gap-3"
          >
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="details">{details}</TabsContent>
            <TabsContent value="custom">{form}</TabsContent>
          </Tabs>
        )}
      </section>
    </Fragment>
  );
}
