"use client";

import { Fragment } from "react";
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
import { DollarSignIcon } from "lucide-react";

export default function CreateSavingsPage() {
  return (
    <Fragment>
      <Header homeBtn={true} title="Add New Goal">
        <BackBtn />
      </Header>
      <section className="px-3 pt-6">
        <form action="">
          <FieldSet>
            <InputGroup className="border-0 border-b rounded-none h-12">
              <InputGroupAddon>
                <InputGroupText>
                  <DollarSignIcon />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                placeholder="0.00"
                className="font-bold text-center text-5xl"
              />
            </InputGroup>
            <FieldGroup>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="Vacation Fund" />
                  <InputGroupAddon className="text-white font-bold">
                    Goal Name:
                  </InputGroupAddon>
                </InputGroup>
                <FieldError />
              </Field>
              <Field>
                <InputGroup>
                  <InputGroupInput placeholder="$0.00" />
                  <InputGroupAddon className="text-white font-bold">
                    Monthly Saving:
                  </InputGroupAddon>
                </InputGroup>
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
                <TransactionInput type="date" label="Targeted Date" />
                <FieldError />
              </Field>
              <Field>
                <Button type="submit">Add Goal</Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </section>
    </Fragment>
  );
}
