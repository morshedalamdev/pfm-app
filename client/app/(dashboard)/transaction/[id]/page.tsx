import Header from "@/components/Header";
import {
  Field,
  FieldDescription,
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

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
          <InputGroup className="border-0 border-b rounded-none h-12 mb-4">
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
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Expense</TabsTrigger>
              <TabsTrigger value="password">Income</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an occupation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Occupation</SelectLabel>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="job">Job</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="nothing">Nothing</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
