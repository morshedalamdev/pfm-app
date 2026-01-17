import Header from "@/components/Header";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { DollarSign, X } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TransactionInput from "@/components/TransactionInput";

const EXPENSE_CATEGORY = [
  "Groceries",
  "Food",
  "Dining",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Shopping",
  "Travel",
];

export default function CreateTransaction() {
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Add New Transaction">
        <Link href="/transaction/create">
          <X className="size-3" />
        </Link>
      </Header>
      <section className="px-3 pt-6">
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
              <TabsTrigger value="password">Income</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <TransactionInput type="select" label="Category" list={EXPENSE_CATEGORY} />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="text" label="Note" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="date" label="Date"/>
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="boolean" label="Recurring" />
                    <FieldError />
                  </Field>
                  <Field>
                    <TransactionInput type="boolean" label="Ignore form Budgets" />
                    <FieldError />
                  </Field>
                  <Field>
                    <Button type="submit">
                      Add Transaction
                    </Button>
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
