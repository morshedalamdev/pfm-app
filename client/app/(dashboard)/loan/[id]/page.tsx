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
import { DollarSign, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionInput from "@/components/inputs/TransactionInput";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateLoan() {
  const [active, setActive] = useState<"lent" | "borrowed">("lent");
  const router = useRouter();

  return (
    <main className="flex flex-col h-dvh">
      <Header homeBtn={true} title="Add New Loan">
        <Button
          variant="link"
          size="icon-sm"
          className="x-icon-bg"
          onClick={router.back}
        >
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
          <div className="bg-secondary text-primary inline-flex h-8 p-1 w-full items-center rounded-full mb-3">
            <Button onClick={()=>setActive("lent")} type="button" variant={active == "lent" ? "default" : "ghost"} className="w-1/2 rounded-full h-6">Lent</Button>
            <Button onClick={()=>setActive("borrowed")} type="button" variant={active == "borrowed" ? "default" : "ghost"} className="w-1/2 rounded-full h-6">Borrowed</Button>
          </div>
          <FieldSet>
            <FieldGroup>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder={active === "lent" ? "Lent to..." : "Borrowed from..."} />
                  <InputGroupAddon className="text-white">
                    <User />
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="Optional" />
                  <InputGroupAddon className="text-white">
                    <Phone className="size-3.5" />
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <TransactionInput type="date" label="Lent Date" />
                <FieldError />
              </Field>
              <Field>
                <TransactionInput type="date" label="Due Date" />
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
                <Button type="submit">{active === "lent" ? "Add Lent" : "Add Borrowed"}</Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </main>
  );
}
