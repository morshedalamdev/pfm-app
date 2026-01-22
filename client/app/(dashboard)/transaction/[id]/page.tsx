"use client";

import Header from "@/components/Header";
import { Field, FieldError, FieldGroup, FieldSet } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { DollarSign, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import TransactionInput from "@/components/items/TransactionInput";
import { useRouter } from "next/navigation";

const EXPENSE_CATEGORY = [
  "Groceries",
  "Dining",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Shopping",
  "Travel",
  "Personal Care",
  "Gifts & Donations",
  "Bills & Fees",
  "Debt Payment",
  "Other",
];
const INCOME_SOURCE = [
  "Salary",
  "Business",
  "Investments",
  "Freelance",
  "Rental",
  "Bonuses",
  "Other",
];
const RECURRENCE_OPTIONS = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];

export default function CreateTransaction() {
  const router = useRouter();
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Add New Transaction">
        <Button variant="link" size="icon-sm" className="x-icon-bg" onClick={router.back}>
          <X className="size-3" />
        </Button>
      </Header>
      <section className="px-3 pt-9">
        <form action="">
          <InputGroup className="border-0 border-b rounded-none h-12 mb-5">
            <InputGroupAddon>
              <InputGroupText>
                <DollarSign />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              placeholder="0.00"
              className="font-bold text-center text-5xl"
            />
          </InputGroup>
          <Tabs defaultValue="expense">
            <TabsList>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <TransactionInput
                      type="select"
                      label="Category"
                      list={EXPENSE_CATEGORY}
                    />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="date" label="Date" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput
                      type="boolean"
                      label="Ignore form Budgets"
                    />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="boolean" label="Recurring" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="select" label="Recurring Every" list={RECURRENCE_OPTIONS} />
                    <FieldError />
                  </Field>
                  <Field>
                    <InputGroup>
                      <InputGroupTextarea
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
                    <Button type="submit">Add Transaction</Button>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </TabsContent>
            <TabsContent value="income">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <TransactionInput
                      type="select"
                      label="Source"
                      list={INCOME_SOURCE}
                    />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="date" label="Date" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="boolean" label="Recurring" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="select" label="Recurring Every" list={RECURRENCE_OPTIONS} />
                    <FieldError />
                  </Field>
                  <Field>
                    <InputGroup>
                      <InputGroupTextarea
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
                    <Button type="submit">Add Transaction</Button>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </TabsContent>
          </Tabs>
        </form>
      </section>
    </main>
  );
}
